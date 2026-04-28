QUEUE="notifications:queue"
DLQ="${QUEUE}:dlq"
REDIS_HOST="redis"
 
echo "=== Clearing queues ==="
redis-cli -h $REDIS_HOST DEL $QUEUE
redis-cli -h $REDIS_HOST DEL $DLQ
 
echo ""
echo "=== Injecting poison pills ==="
 
# Pill 1 — invalid JSON
redis-cli -h $REDIS_HOST RPUSH $QUEUE 'not-valid-json'
echo "Pushed: invalid JSON"
 
# Pill 2 — missing userId and eventId
redis-cli -h $REDIS_HOST RPUSH $QUEUE '{"broken": true}'
echo "Pushed: missing required fields"
 
# Pill 3 — missing eventId only
redis-cli -h $REDIS_HOST RPUSH $QUEUE '{"userId": "123"}'
echo "Pushed: missing eventId"
 
echo ""
echo "=== Injecting valid messages ==="
 
redis-cli -h $REDIS_HOST RPUSH $QUEUE '{"userId": "123", "eventId": "abc"}'
echo "Pushed: valid message 1"
 
redis-cli -h $REDIS_HOST RPUSH $QUEUE '{"userId": "456", "eventId": "def"}'
echo "Pushed: valid message 2"
 
echo ""
echo "=== Waiting 3s for worker to process ==="
sleep 3
 
echo ""
echo "=== Queue depths ==="
echo "Main queue depth : $(redis-cli -h $REDIS_HOST LLEN $QUEUE)"
echo "DLQ depth        : $(redis-cli -h $REDIS_HOST LLEN $DLQ)"
 
echo ""
echo "=== DLQ contents ==="
redis-cli -h $REDIS_HOST LRANGE $DLQ 0 -1
 
echo ""
echo "=== Health check ==="
curl -s http://notification:3000/health | jq .
 