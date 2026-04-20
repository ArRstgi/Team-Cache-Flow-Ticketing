import express from 'express'
import pg from 'pg'
import { createClient } from 'redis'

const app = express();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

const startTime = Date.now();

const PURCHASE_SERVICE_URL = "TODO";
const PAYMENT_SERVICE_URL = "TODO";

app.get('/health', async (req, res) => {
  const checks = {}
  let healthy = true

  // Check PostgreSQL
  const dbStart = Date.now()
  try {
    await pool.query('SELECT 1')
    checks.database = { status: 'healthy', latency_ms: Date.now() - dbStart }
  } catch (err) {
    checks.database = { status: 'unhealthy', error: err.message }
    healthy = false
  }

  // Check Redis
  const redisStart = Date.now()
  try {
    const pong = await redis.ping()
    if (pong !== 'PONG') throw new Error(`unexpected response: ${pong}`)
    checks.redis = { status: 'healthy', latency_ms: Date.now() - redisStart }
  } catch (err) {
    checks.redis = { status: 'unhealthy', error: err.message }
    healthy = false
  }

  const body = {
    status: healthy ? 'healthy' : 'unhealthy',
    service: process.env.SERVICE_NAME ?? 'unknown',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    checks,
  }

  res.status(healthy ? 200 : 503).json(body)
})

app.post('refund', async (req, res) => {
  const { userid, purchaseid } = req.body;

  if (!userid || !purchaseid) {
    return res.status(400).json({ error: 'Missing required fields: userid and purchaseid' });
  }

  // --- 1. Confirm purchase exists via Purchase Service ---
  let purchase;
  try {
    const purchaseRes = await fetch(`${PURCHASE_SERVICE_URL}/purchases/${purchaseid}?userid=${userid}`);

    if (purchaseRes.status === 404) {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    if (!purchaseRes.ok) {
      return res.status(502).json({ error: 'Purchase service error' });
    }

    purchase = await purchaseRes.json();
    // Assumed shape: { purchaseid, userid, itemid, amountPaid, currency, purchasedAt }
  } catch (err) {
    console.error('Failed to reach purchase service:', err);
    return res.status(503).json({ error: 'Purchase service unreachable' });
  }

  // --- 2. Check Refund DB to prevent double refunds ---
  try {
    const existing = await pool.query(
      'SELECT id FROM refunds WHERE purchaseid = $1',
      [purchaseid]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Purchase has already been refunded' });
    }
  } catch (err) {
    console.error('Refund DB query failed:', err);
    return res.status(500).json({ error: 'Database error while checking refund status' });
  }

  // --- 3. Call Payment Service to execute the refund ---
  try {
    const paymentRes = await fetch(`${PAYMENT_SERVICE_URL}/refunds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userid,
        purchaseid,
        amount: purchase.amountPaid,
        currency: purchase.currency,
      }),
    });

    if (!paymentRes.ok) {
      const paymentErr = await paymentRes.json().catch(() => ({}));
      console.error('Payment service rejected refund:', paymentErr);
      return res.status(502).json({ error: 'Payment refund failed', details: paymentErr });
    }
  } catch (err) {
    console.error('Failed to reach payment service:', err);
    return res.status(503).json({ error: 'Payment service unreachable' });
  }

  // --- 4. Record the refund in our own DB ---
  try {
    await pool.query(
      'INSERT INTO refunds (purchaseid, userid, refunded_at) VALUES ($1, $2, NOW())',
      [purchaseid, userid]
    );
  } catch (err) {
    // Payment went through but we failed to record it - log loudly for manual reconciliation
    console.error('CRITICAL: Refund processed but failed to record in DB:', { userid, purchaseid, err });
    // Still continue — the refund did succeed, so we shouldn't return a failure to the client
  }

  // --- 5. Publish "seat released" event via Redis pub/sub ---
  try {
    await redis.publish('seat.released', JSON.stringify({
      userid,
      purchaseid,
      itemid: purchase.itemid,
      releasedAt: new Date().toISOString(),
    }));
  } catch (err) {
    // Non-fatal: log for investigation, but don't fail the response
    console.error('Failed to publish seat.released event:', { userid, purchaseid, err });
  }
  return res.status(200).json({ message: 'Refund successful and seat released' });
})

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Refund service is running on port ${PORT}`);
})