import express from 'express'
import { createClient } from 'redis'

const app = express();
app.use(express.json());
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const startTime = Date.now();

// Notification Worker Service
const QUEUE_NAME = process.env.QUEUE_NAME ?? 'notifications:queue';
const DLQ_NAME   = `${QUEUE_NAME}:dlq`;
let jobsProcessed = 0;
let lastJobAt     = null;

async function runWorker() {
    console.log(`[Notification Worker] Listening on ${QUEUE_NAME}`);
    while (true) {
        try {
            const result = await redis.brPop(QUEUE_NAME, 5);
            if (!result) continue;
 
            let message;
            try {
                message = JSON.parse(result.element);
            } catch (err) {
                console.log(JSON.stringify({
                    event: 'poison_pill',
                    reason: 'invalid JSON',
                    raw: result.element,
                    dlq: DLQ_NAME,
                    timestamp: new Date().toISOString(),
                }));
                await redis.rPush(DLQ_NAME, result.element);
                continue;
            }
 
            if (!message.userId || !message.eventId) {
                console.log(JSON.stringify({
                    event: 'poison_pill',
                    reason: 'missing userId or eventId',
                    message,
                    dlq: DLQ_NAME,
                    timestamp: new Date().toISOString(),
                }));
                await redis.rPush(DLQ_NAME, result.element);
                continue;
            }
 
            console.log(JSON.stringify({
                event: 'job_processed',
                userId: message.userId,
                eventId: message.eventId,
                timestamp: new Date().toISOString(),
            }));
            console.log(`Sending confirmation to user ${message.userId} for event ${message.eventId}`);
 
            jobsProcessed++;
            lastJobAt = new Date().toISOString();
 
        } catch (err) {
            console.error('[Notification Worker] Unexpected error:', err.message);
        }
    }
}
 
runWorker();

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
    
    // Check cache (set and get a test key)
    try {
        await redis.set('health:cache:test', '1', { EX: 5 });
        const val = await redis.get('health:cache:test');
        checks.cache = val === '1'
            ? { status: 'healthy' }
            : { status: 'unhealthy', error: 'cache read/write mismatch' };
    } catch (err) {
        checks.cache = { status: 'unhealthy', error: err.message };
        healthy = false;
    }

    // check queue and dlq depth
    try {
        const depth    = await redis.lLen(QUEUE_NAME);
        const dlqDepth = await redis.lLen(DLQ_NAME);
        checks.queue = {
            status:    dlqDepth > 0 ? 'degraded' : 'healthy',
            depth,
            dlq_depth: dlqDepth,
        };
    } catch (err) {
        checks.queue = { status: 'unhealthy', error: err.message };
        healthy = false;
    }

    const body = {
        status: healthy ? 'healthy' : 'unhealthy',
        service: process.env.SERVICE_NAME ?? 'unknown',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        jobs_processed: jobsProcessed,
        last_job_at: lastJobAt,
        checks,
    };

    res.status(healthy ? 200 : 503).json(body);
});

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
