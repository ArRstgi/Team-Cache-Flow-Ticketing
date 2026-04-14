import express from 'express'
import { createClient } from 'redis'

const app = express();
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const startTime = Date.now();

app.get('/health', async (_req, res) => {
    const checks = {};
    let healthy = true;

    // Check Redis
    const redisStart = Date.now();
    try {
        const pong = await redis.ping();
        if (pong !== 'PONG') throw new Error(`unexpected response: ${pong}`);
        checks.redis = { status: 'healthy', latency_ms: Date.now() - redisStart };
    } catch (err) {
        checks.redis = { status: 'unhealthy', error: err.message };
        healthy = false;
    }

    const body = {
        status: healthy ? 'healthy' : 'unhealthy',
        service: process.env.SERVICE_NAME ?? 'unknown',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        checks,
    };

    res.status(healthy ? 200 : 503).json(body);
});

app.use(express.json());

app.post('/notify', (req, res) => {
    const { userId, eventId } = req.body;

    if (!userId || !eventId) {
        return res.status(400).json({
            error: "Missing userId or eventId"
        });
    }

    // Simulate sending email (Sprint 1 = just log)
    console.log(`Sending confirmation to user ${userId} for event ${eventId}`);

    res.json({
        status: "notification_sent",
        userId,
        eventId
    });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
    console.log(`[Notification Service] Listening on port ${PORT}`);
});
