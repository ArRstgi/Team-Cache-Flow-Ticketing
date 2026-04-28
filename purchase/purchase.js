import express from 'express'
import pg from 'pg'
import { createClient } from 'redis'
import bodyParser from 'body-parser'

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const port = Number(process.env.PORT || '9001');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const subscriber = redis.duplicate();
await subscriber.connect();

// Ensure purchases table exists
await pool.query(`
    CREATE TABLE IF NOT EXISTS purchases (
        user_id TEXT UNIQUE NOT NULL,
        seat_number TEXT NOT NULL,
        event_id TEXT NOT NULL,
        purchase_id UUID DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
`);

const startTime = Date.now();

app.use(express.json());

// Subscribe to waitlist's seat released channel
await subscriber.subscribe('seat.purchase', async (data) => {
    const payload = JSON.parse(data);
    console.log("Received data from waitlist:", payload);
    const response = await fetch('http://purchase:9001/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    console.log(`Status of transferring waitlist request to purchase: ${response.status}`);
});

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
    const payload = req.body ?? {};
    const user_id = String(payload.user_id);
    const seat_number = String(payload.seat_number);
    const event_id = String(payload.event_id);

    try {
        await pool.query(`INSERT INTO purchases VALUES ('${user_id}', '${seat_number}', '${event_id}');`);
        let query_results = await pool.query(`SELECT * FROM purchases WHERE user_id = '${user_id}';`);
        query_results = (query_results.rows)[0];

        // Post to fraud detection queue
        try {
            await redis.lPush('fraud_detection_jobs', JSON.stringify(query_results));
        }
        catch (err) {
            console.log("Failed to add purchase to fraud_detection_jobs queue:", err);
        }
        
        // Post to subscribers
        try {
            await redis.publish('purchase.processed', JSON.stringify({
                user_id: query_results.user_id,
                seat_number: query_results.seat_number,
                event_id: query_results.event_id,
                purchase_id: query_results.purchase_id,
                created_at: query_results.created_at
            }));
        }
        catch (err) {
            console.error('Failed to publish purchase.processed event:', {user_id: query_results.user_id, seat_number: query_results.seat_number, event_id: query_results.event_id, purchase_id: query_results.purchase_id, created_at: query_results.created_at, err});
        }
        
        res
            .status(201)
            .json({
                duplicate: false,
                user_id: query_results.user_id,
                seat_number: query_results.seat_number,
                event_id: query_results.event_id,
                purchase_id: query_results.purchase_id,
                created_at: query_results.created_at
            });
    }
    catch (error) {
        let query_results = await pool.query(`SELECT * FROM purchases WHERE user_id = '${user_id}';`);
        query_results = (query_results.rows)[0];
        res
            .status(200)
            .json({
                duplicate: true,
                user_id: query_results.user_id,
                seat_number: query_results.seat_number,
                event_id: query_results.event_id,
                purchase_id: query_results.purchase_id,
                created_at: query_results.created_at
            });
    }
});

app.get('/fetch_purchase', async (req, res) => {
    const payload = req.query ?? {};
    const user_id = String(payload.user_id);
    const purchase_id = String(payload.purchase_id);

    try {
        let cache_fetch = await redis.get(`${user_id}, ${purchase_id}`);
        if (cache_fetch == null) {
            console.log("Not in cache, caching...");
            try {
                let query_results = await pool.query(`SELECT * FROM purchases WHERE user_id = '${user_id}' AND purchase_id = '${purchase_id}';`);
                query_results = (query_results.rows)[0];
                await redis.set(`${user_id}, ${purchase_id}`, JSON.stringify(query_results));
                res
                    .status(201)
                    .json({
                        user_id,
                        seat_number: query_results.seat_number,
                        event_id: query_results.event_id,
                        purchase_id,
                        created_at: query_results.created_at
                    });
            }
            catch (err) {
                console.log('Failed to fetch entry corresponding to:', {user_id, purchase_id, err});
                res
                    .status(200)
                    .json({
                        user_id,
                        purchase_id,
                        err
                    });
            }
        }
        else {
            console.log("fetched from cache");
            cache_fetch = JSON.parse(cache_fetch)
            res
                .status(201)
                .json({
                    user_id: cache_fetch.user_id,
                    seat_number: cache_fetch.seat_number,
                    event_id: cache_fetch.event_id,
                    purchase_id: cache_fetch.purchase_id,
                    created_at: cache_fetch.created_at
                });
        }
    }
    catch (err) {
        console.log('Failed to check redis cache with:', {user_id, purchase_id, err});
    }
});

app.get('/dump_db', async (_req, res) => {
    let query_results = await pool.query(`SELECT * FROM purchases`);
    query_results = query_results.rows;
    res
        .status(200)
        .json({
            rows: query_results
        });
});

app.get('/', (_req, res) => {
    res.send(`
        <h1>Purchase is Online!</h1>
    `);
});

app.get('/manual_test', (_req, res) => {
    res.send(`
        <h1>Manual Purchase Test</h1>
        <form action="/purchase" method="POST" id="form">
            <label for="user_id">user_id:</label>
            <input type="text" id="user_id" name="user_id" value="1" required><br>

            <label for="seat_number">seat_number:</label>
            <input type="text" id="seat_number" name="seat_number" value="5" required><br>

            <label for="event_id">event_id:</label>
            <input type="text" id="event_id" name="event_id" value="777" required><br>

            <button type="submit">Submit</button>
        </form>
    `);
});

app.listen(port, () => {
    console.log(
        `API listening on port ${port}`,
    );
});
