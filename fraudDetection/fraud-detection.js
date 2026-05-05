import { createClient } from 'redis'
import express from 'express'

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
const queueName = process.env.QUEUE_NAME || 'fraud_detection_jobs'
const ttlSec = Number(process.env.IDEM_TTL_SEC || '86400')

const app = express();
app.use(express.json())
const client = createClient({ url: 'redis://redis:6379' })
await client.connect()

let userHistory = []
let timeHistory = []

client.on('error', err => {
  console.error('Fraud Detection Redis error:', err.message)
})

async function processJob(order) {
  console.log("Fraud detection started")
  if (!order.purchase_id || !order.user_id || !order.event_id || !order.created_at || !order.seat_number || !order.amount || !order.currency){
    client.lPush(`${queueName}:dlq`, JSON.stringify(order))
    console.log("Malformed request, pushed to DLQ")
    return
  }
  let fraud = false
  userHistory.push(order.user_id)
  timeHistory.push(order.created_at)
  let userIndices = userHistory.flatMap((item, i) => item === order.user_id ? i : []);
  let userTimes = []
  if (userIndices.length > 2)
    userIndices.forEach((i) => userTimes.push(timeHistory[i]))
    userTimes.forEach((val, i) => userTimes[i] = Date.parse(val))
    //console.log(userTimes)
    for (let i = 0; i < userTimes.length - 1; i++) {
        if (Math.abs(userTimes[i] - userTimes[i + 1]) < 60000 ) {
            console.log(`Fraud detected`);
            fraud = true;
            console.log("!!! FRAUD DETECTED !!!")
            break;
        }
    }
    order.isFraud = fraud
  console.log("Sending to payment service")
  const paymentRes = await fetch(`http://payment:3000/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
  console.log("Fraud detection complete")

}

async function loop() {
  while (true) {
    const result = await client.rPop(queueName, 0)
    if (!result)
        continue
    console.log(result)
    let order
    try {
      order = JSON.parse(result)
    } catch (err) {
      console.error('Invalid order payload:', err.message)
      client.lPush(`${queueName}:dlq`, result)
    }
    try {
      await processJob(order)
    } catch (err) {
      console.error(`Job failed:`, err.message)
      client.lPush(`${queueName}:dlq`, result)
    }
  }
}


app.get('/health', async (req, res) => {
  const checks = {}
  let healthy = true

  // Check Redis
  const redisStart = Date.now()
  try {
    console.log("PING")
    await client.ping()
    console.log("PONG")
    checks.redis = { status: 'healthy', latency_ms: Date.now() - redisStart }
  } catch (err) {
    checks.redis = { status: 'unhealthy', error: err.message }
    healthy = false
  }
    checks.redis = { status: 'healthy', latency_ms: Date.now() - redisStart }

  try {
    const depth = await client.lLen(queueName)
    const dlqDepth = await client.lLen(`${queueName}:dlq`)
    checks.queue = {
      status: dlqDepth > 0 ? 'degraded' : 'healthy',
      depth: depth,
      dlq_depth: dlqDepth,
    }
  } catch (err) {
    checks.queue = { status: 'unhealthy', error: err.message }
    healthy = false
  }


  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    service: 'fraud-detection',
    created_at: new Date().toISOString(),
    checks,
  })
})


app.listen(9002)
console.log(`Fraud detection worker connected`)
// await client.lPush(queueName, JSON.stringify(testOrder1))
// await client.lPush(queueName, JSON.stringify(testOrder2))
// await client.lPush(queueName, JSON.stringify(testOrder3))
// await client.lPush(queueName, JSON.stringify(testOrder4))
await loop()
