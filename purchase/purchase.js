import express from 'express'
import pg from 'pg'
import { createClient } from 'redis'

const app = express();
app.use(express.static('public'));

const port = Number(process.env.PORT || '9001');
const PAYMENT_URL = process.env.PAYMENT_URL || 'http://payment:3000';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

// Ensure purchases table exists
await pool.query(`
  CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_token TEXT NOT NULL,
    transaction_id TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

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

app.post('/purchase', async (req, res) => {
    const { event_id, user_id, amount, payment_token } = req.body ?? {};
    if (!event_id || !user_id || !amount || !payment_token) {
        return res.status(400).json({ error: 'event_id, user_id, amount, and payment_token are required' });
    }

    // Synchronous call to Payment Service
    let paymentResult;
    try {
        const response = await fetch(`${PAYMENT_URL}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, payment_token }),
        });
        paymentResult = await response.json();
    } catch (err) {
        return res.status(502).json({ error: 'Payment service unreachable', detail: err.message });
    }

    const status = paymentResult.success ? 'confirmed' : 'failed';
    const { rows } = await pool.query(
        `INSERT INTO purchases (event_id, user_id, amount, payment_token, transaction_id, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, status, transaction_id`,
        [event_id, user_id, amount, payment_token, paymentResult.transaction_id ?? null, status]
    );

    res.status(paymentResult.success ? 201 : 402).json({
        purchase_id: rows[0].id,
        status: rows[0].status,
        transaction_id: rows[0].transaction_id,
    });
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