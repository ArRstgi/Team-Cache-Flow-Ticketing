import express from 'express'
import { createClient } from 'redis'

const app = express()
app.use(express.json())

const port = Number(process.env.PORT || '8080')

const redis = createClient({ url: process.env.REDIS_URL })
await redis.connect();

const subscriber = redis.duplicate();
await subscriber.connect();

await subscriber.subscribe('seat.released',async (data) => {
  const event = JSON.parse(data);
  console.log(`Received seat.released event: ${data}`);
  await handleSeatReleased(event);
});

// For testing, we can push some entries onto the waitlist
await redis.rPush(
  "waitlist:test_event_id_1",
  JSON.stringify({
    userId: "userA"
  })
)

await redis.rPush(
  "waitlist:test_event_id_1",
  JSON.stringify({
    userId: "userB"
  })
)

await redis.rPush(
  "waitlist:test_event_id_1",
  JSON.stringify({
    userId: "userC"
  })
)

async function handleSeatReleased(event) {
  const {event_id, seat_number} = event;
  
  if (!event_id || !seat_number) {
    console.error(`Invalid seat.released event: ${JSON.stringify(event)}`);
    return;
  }

  const data = await redis.lPop(`waitlist:${event_id}`);

  if (!data) {
    console.log(`No waitlist entries for event ${event_id}`);
    return;
  }
  try {
    const waitlistEntry = JSON.parse(data);
    if (!waitlistEntry.userId) {
      throw new Error("Missing userId");
    }
    await redis.publish(
    "seat.purchase",
    JSON.stringify({
      user_id: waitlistEntry.userId,
      seat_number: seat_number,
      event_id: event_id,
    }));
    console.log(`Promoted ${waitlistEntry.userId} for event ${event_id}, seat ${seat_number}`);
    recordJobProcessed();
  } 
  catch (err) {
    console.error(`Error parsing waitlist entry for event ${event_id}: ${err.message}`);
    await redis.rPush(process.env.DLQ_NAME ?? `waitlist:dlq`, data); 
    return;
  }
}

const startTime = Date.now()
let lastJobAt = null
let jobsProcessed = 0

// Your worker loop sets these as it runs
export function recordJobProcessed() {
  lastJobAt = new Date().toISOString()
  jobsProcessed++
}

async function getWaitlistDepth() {
  const keys = (await redis.keys("waitlist:*"))
  .filter(k => k !== "waitlist:dlq");

  let total = 0;

  for (const key of keys) {
    total += await redis.lLen(key);
  }

  return total;
}

app.get('/health', async (req, res) => {
  const checks = {}
  let healthy = true

  // Check Redis
  const redisStart = Date.now()
  try {
    await redis.ping()
    checks.redis = { status: 'healthy', latency_ms: Date.now() - redisStart }
  } catch (err) {
    checks.redis = { status: 'unhealthy', error: err.message }
    healthy = false
  }

  // Check queue depth — flag if backlog is growing
  try {
    const depth = await getWaitlistDepth();
    const dlqDepth = await redis.lLen(
      process.env.DLQ_NAME ?? `waitlist:dlq`
    )
    checks.queue = {
      status: depth < 1000 ? 'healthy' : 'degraded',
      depth,
      dlq_depth: dlqDepth,
    }
    if (dlqDepth > 0) checks.queue.status = 'degraded' // any DLQ entries are worth surfacing
  } catch (err) {
    checks.queue = { status: 'unhealthy', error: err.message }
    healthy = false
  }

  // Check that the worker is actually processing jobs
  const secondsSinceLastJob = lastJobAt
    ? (Date.now() - new Date(lastJobAt).getTime()) / 1000
    : null
  checks.worker = {
    status:
      secondsSinceLastJob === null || secondsSinceLastJob < 60
        ? 'healthy'
        : 'degraded',
    last_job_at: lastJobAt ?? 'never',
    jobs_processed: jobsProcessed,
    seconds_since_last_job: secondsSinceLastJob,
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: process.env.WORKER_NAME ?? 'worker',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    checks,
  })
})

app.listen(port ?? 8080)