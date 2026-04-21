const Redis = require("ioredis");
const { Pool } = require("pg");
const http = require("http");

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
const dbUrl = process.env.DATABASE_URL || "postgres://app:secret@analytics-db:5432/analytics";
const port = parseInt(process.env.PORT || "3005");
const queueName = process.env.QUEUE_NAME || "analytics:queue";
const dlqName = "analytics:dlq";

const redis = new Redis(redisUrl);
const db = new Pool({ connectionString: dbUrl });

let jobsProcessed = 0;
let lastJobAt = null;
let redisOk = false;

async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ticket_stats (
      event_id TEXT PRIMARY KEY,
      tickets_sold INT NOT NULL DEFAULT 0,
      last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS browse_stats (
      id SERIAL PRIMARY KEY,
      event_id TEXT NOT NULL,
      browsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log(JSON.stringify({ level: "info", msg: "db initialized" }));
}

async function processJob(raw) {
  let job;
  try {
    job = JSON.parse(raw);
  } catch (e) {
    console.log(JSON.stringify({ level: "warn", msg: "malformed job, moving to dlq", raw }));
    await redis.rpush(dlqName, raw);
    return;
  }

  const { type, eventId } = job;

  if (!type || !eventId) {
    console.log(JSON.stringify({ level: "warn", msg: "missing fields, moving to dlq", job }));
    await redis.rpush(dlqName, raw);
    return;
  }

  if (type === "purchase") {
    await db.query(`
      INSERT INTO ticket_stats (event_id, tickets_sold, last_updated)
      VALUES ($1, 1, NOW())
      ON CONFLICT (event_id)
      DO UPDATE SET
        tickets_sold = ticket_stats.tickets_sold + 1,
        last_updated = NOW()
    `, [eventId]);
    console.log(JSON.stringify({ level: "info", msg: "purchase recorded", eventId }));
  } else if (type === "browse") {
    await db.query(`INSERT INTO browse_stats (event_id, browsed_at) VALUES ($1, NOW())`, [eventId]);
    console.log(JSON.stringify({ level: "info", msg: "browse recorded", eventId }));
  } else {
    console.log(JSON.stringify({ level: "warn", msg: "unknown type, moving to dlq", job }));
    await redis.rpush(dlqName, raw);
    return;
  }

  jobsProcessed++;
  lastJobAt = new Date().toISOString();
}

async function workerLoop() {
  console.log(JSON.stringify({ level: "info", msg: "worker started", queue: queueName }));
  while (true) {
    try {
      const result = await redis.blpop(queueName, 5);
      redisOk = true;
      if (!result) continue;
      const [, raw] = result;
      await processJob(raw);
    } catch (err) {
      redisOk = false;
      console.log(JSON.stringify({ level: "error", msg: "worker error", error: err.message }));
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function getQueueDepth() {
  try {
    const depth = await redis.llen(queueName);
    const dlqDepth = await redis.llen(dlqName);
    return { depth, dlq_depth: dlqDepth };
  } catch {
    return { depth: 0, dlq_depth: 0 };
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    const { depth, dlq_depth } = await getQueueDepth();
    const body = JSON.stringify({
      status: redisOk ? "healthy" : "degraded",
      service: "analytics-worker",
      redis: redisOk ? "ok" : "error",
      depth,
      dlq_depth,
      jobs_processed: jobsProcessed,
      last_job_at: lastJobAt
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
  } else {
    res.writeHead(404);
    res.end();
  }
});

async function main() {
  await initDb();
  server.listen(port, () => {
    console.log(JSON.stringify({ level: "info", msg: `health server listening on ${port}` }));
  });
  await workerLoop();
}

main().catch(err => {
  console.error(JSON.stringify({ level: "fatal", msg: err.message }));
  process.exit(1);
});
