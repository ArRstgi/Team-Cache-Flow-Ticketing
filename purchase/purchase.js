import express from 'express'
import pg from 'pg'
import { createClient } from 'redis'

const app = express();
app.use(express.static('public'));

const port = Number(process.env.PORT || '9001');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const startTime = Date.now();

app.use(express.json());

app.get('/health', async (_req, res) => {
    const checks = {};
    let healthy = true;

    // Check PostgreSQL
    const dbStart = Date.now();
    try {
        await pool.query('SELECT 1');
        checks.database = { status: 'healthy', latency_ms: Date.now() - dbStart };
    }
    catch (err) {
        checks.database = { status: 'unhealthy', error: err.message };
        healthy = false;
    }

    // Check Redis
    const redisStart = Date.now();
    try {
        const pong = await redis.ping();
        if (pong !== 'PONG') throw new Error(`unexpected response: ${pong}`);
        checks.redis = { status: 'healthy', latency_ms: Date.now() - redisStart };
    }
    catch (err) {
        checks.redis = { status: 'unhealthy', error: err.message };
        healthy = false;
    }

    const body = {
        status: healthy ? 'healthy' : 'unhealthy',
        service: process.env.SERVICE_NAME ?? 'unknown',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
        checks,
    }

    res.status(healthy ? 200 : 503).json(body);
});

app.get('/', (_req, res) => {
    res.send(`
    <h1>Purchase is Online!</h1>
    `);
});

app.listen(port, () => {
    console.log(
        `API listening on port ${port}`,
    );
});