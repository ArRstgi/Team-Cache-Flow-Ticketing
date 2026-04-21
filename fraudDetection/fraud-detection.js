import redis from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
const queueName = process.env.QUEUE_NAME || 'jobs'
const ttlSec = Number(process.env.IDEM_TTL_SEC || '86400')

const client = redis.createClient({ url: redisUrl })

let userHistory = []
let timeHistory = []

client.on('error', err => {
  console.error('Fraud Detection Redis error:', err.message)
})

// let testOrder1 = {
//     purchaseId: '1',
//     userId: 'steve',
//     timestamp: new Date().toISOString()
// }

async function processJob(order) {
  let fraud = false
  if ('isFraud' in order)
  {
    //already checked
    return
  }
  await client.expire(order.purchaseId, ttlSec)
  userHistory.push(order.userId)
  timeHistory.push(order.timestamp)
  let temp = userHistory.flatMap((item, i) => item === order.userId ? i : []);
  let count = temp.length;
  let temp2 = []
  if (count > 2)
    temp.forEach((i) => temp2.push(timeHistory[i]))
    temp2.forEach((val, i) => temp2[i] = Date.parse(val))
    //console.log(temp2)
    for (let i = 0; i < temp2.length - 1; i++) {
        if (Math.abs(temp2[i] - temp2[i + 1]) < 60000 ) {
            console.log(`Fraud detected`);
            fraud = true;
            break;
        }
}
  await client.hSet(order.purchaseId, {
        isFraud: String(fraud),
      })
  // await client.lPush(queueName, JSON.stringify(order))

}

async function loop() {
  while (true) {
    const result = await client.brPop(queueName, 0)
    const raw = result?.element
    if (!raw) continue
    let order
    try {
      order = JSON.parse(raw)
    } catch (err) {
      console.error('Invalid order payload:', err.message)
      continue
    }
    try {
      await processJob(order)
    } catch (err) {
      const failedAt = new Date().toISOString()
      await client.hSet(order.purchaseId, {
        status: 'failed',
        updatedAt: failedAt,
        error: err.message,
      })
      console.error(`order=${order.purchaseId} status=failed error=${err.message}`)
    }
  }
}

await client.connect()
console.log(`Fraud detection worker connected`)
// await client.lPush(queueName, JSON.stringify(testOrder1))
// await client.lPush(queueName, JSON.stringify(testOrder1))
// await client.lPush(queueName, JSON.stringify(testOrder1))
await loop()
