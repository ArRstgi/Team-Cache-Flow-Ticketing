const http = require('http');
const redis = require('ioredis');

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

const redisClient = new redis(REDIS_URL, { lazyConnect: true, enableOfflineQueue: false });
redisClient.connect().catch(() => {});

async function checkRedis() {
  try {
    await redisClient.ping();
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    const redisStatus = await checkRedis();
    const healthy = redisStatus === 'ok';
    res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: healthy ? 'ok' : 'degraded', redis: redisStatus }));
    return;
  }

  if (req.method === 'POST' && req.url === '/payment') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      const { amount, payment_token } = payload;
      if (!amount || !payment_token) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'amount and payment_token are required' }));
        return;
      }
      // Simulated payment: always succeeds unless token starts with "fail"
      const success = !String(payment_token).startsWith('fail');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success, transaction_id: success ? `txn_${Date.now()}` : null }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => console.log(`Payment service listening on port ${PORT}`));
