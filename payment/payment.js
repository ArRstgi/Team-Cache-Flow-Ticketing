const http = require("http");
const redis = require("ioredis");

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

const redisClient = new redis(REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
});
redisClient.connect().catch(() => {});

const startTime = Date.now();

async function checkRedis() {
  try {
    await redisClient.ping();
    return "ok";
  } catch {
    return "unavailable";
  }
}

function parseJSON(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    const redisStart = Date.now();
    const redisStatus = await checkRedis();
    const redisLatency = Date.now() - redisStart;
    const healthy = redisStatus === "ok";

    res.writeHead(healthy ? 200 : 503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: healthy ? "healthy" : "unhealthy",
        service: "payment",
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        checks: {
          redis: {
            status: healthy ? "healthy" : "unhealthy",
            latency_ms: redisLatency,
          },
        },
      }),
    );
    return;
  }

  if (req.method === "POST" && req.url === "/payment") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const payload = parseJSON(body);
      if (!payload) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
      const { amount, payment_token } = payload;
      if (!amount || !payment_token) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "amount and payment_token are required" }),
        );
        return;
      }
      const success = !String(payment_token).startsWith("fail");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success,
          transaction_id: success ? `txn_${Date.now()}` : null,
        }),
      );
    });
    return;
  }

  if (req.method === "POST" && req.url === "/refunds") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const payload = parseJSON(body);
      if (!payload) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }
      const { user_id, purchase_id, amount, currency } = payload;
      if (!user_id || !purchase_id || !amount || !currency) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "user_id, purchase_id, amount, and currency are required",
          }),
        );
        return;
      }
      const success = !String(user_id).startsWith("fail");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success,
          refund_id: success ? `ref_${Date.now()}` : null,
          message: success ? "Refund processed successfully" : "Refund failed",
        }),
      );
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () =>
  console.log(`Payment service listening on port ${PORT}`),
);
