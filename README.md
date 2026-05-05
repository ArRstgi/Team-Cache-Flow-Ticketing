# Team Cache Flow Ticketing — Event Ticketing
**Course:** COMPSCI 426
**Team:** Enver Amboy, Hayun Jung, Daniel Brown, Michael Ye, Arush Rastogi, Casey Hammill, Edison Zheng, Mihir Nagarkatti, Mahad Mushtaq
**System:** Event Ticketing 
**Repository:** https://github.com/ArRstgi/Team-Cache-Flow-Ticketing
---
## Team and Service Ownership - General
**See sprint plans for precise service ownership for each sprint.** The following service ownership includes the primary things the members focused on.
| Team Member | Services / Components Owned                            |
| ----------- | ------------------------------------------------------ |
| Mihir Nagarkatti | `refund/`                    |
| Edison Zheng     | `waitlist/`                  |
| Casey Hammill    | `k6/`, `fraudDetection/`      |
| Arush Rastogi    | `payment/`                   |
| Daniel Brown     | `frontend/`                  |
| Michael Ye       | `catalog/`                   |
| Enver Amboy      | `purchase/`                  |
| Hayun Jung       | `notifications/`             |
| Mahad Mushtaq    | `analytics/`, Sprint Reports |


> Ownership is verified by `git log --author`. Each person must have meaningful commits in the directories they claim.
---
## How to Start the System
```bash
# Start everything (builds images on first run)
docker compose up --build
# Start with service replicas (Sprint 4)
docker compose up --scale purchase=3 --scale catalog=3 --scale payment=3
# Verify all services are healthy
docker compose ps
# Stream logs
docker compose logs -f
# Open a shell in the holmes investigation container
docker compose exec holmes bash

# Run k6 tests
docker compose exec holmes bash
k6 run k6/sprint-1.js
k6 run k6/sprint-2-cache.js
k6 run k6/sprint-2-async.js
k6 run k6/sprint-3-poison.js
k6 run --env SCALE=single k6/sprint-4-scale.js
k6 run --env SCALE=replicated k6/sprint-4-scale.js
k6 run --env SCALE=replicated k6/sprint-4-replica.js
```
### Base URLs (development)
```
caddy         http://caddy:80
catalog       (accessed internally at http://catalog:3000 or via Caddy at http://caddy:80/catalog/...)
payment       (accessed internally at http://payment:3000 or via Caddy at http://caddy:80/payment/...)
notification  http://localhost:3003
waitlist      http://localhost:3010
purchase      (accessed internally at http://purchase:9001 or via Caddy at http://caddy:80/purchase/...)
analytics     http://localhost:3005
refund        (no host port — internal only)
refund        http://localhost:3004
holmes        (no port — access via exec)
frontend      http://localhost:8080
```
> From inside holmes, services are reachable by their Docker service name:
> `curl http://catalog:3000/health`
> `curl http://payment:3000/health`
> `curl http://purchase:9001/health`
> `curl http://fraud-detection:9002/health`
> `curl http://analytics:3005/health`
> `curl http://notification:3000/health`
> `curl http://waitlist:3010/health`
> `curl http://refund:3000/health`
> `curl http://frontend:3010/health`
>
> See [holmes/README.md](holmes/README.md) for a full tool reference.
---
## System Overview

This is a simulated event ticketing platform. Users would be able to buy tickets for events and make refunds if needed. After a refund, a user will be promoted from the waitlist. The services detect fraud, if present, and deny a purchase. Users also receive confirmation emails from their actions. The services also allow developers to monitor and test the app, with an analytics service, load tests with k6, and a frontend to monitor all the service endpoints. Caddy splits high load onto replicas of the services. 

---
## API Reference
<!--
  Document every endpoint for every service.
  Follow the format described in the project documentation: compact code block notation, then an example curl and an example response. Add a level-2 heading per service, level-3 per endpoint.
-->
---
### Waitlist

### GET /health

```
GET /health

  Returns the health status of this worker, Redis and waitlist queues, queue depth, DLQ depth, timestamp of last processed job, and total count of processed jobs.

  Responses:
    200  Worker and all dependencies healthy
    503  One or more dependencies unreachable
```

**Example request:**

```bash
curl http://localhost:3010/health
```

**Example response (200):**

```json
{
  "status": "healthy",
  "service": "waitlist",
  "timestamp": "2026-04-21T14:53:17.616Z",
  "uptime_seconds": 18,
  "checks":
    {
      "redis":
        {
          "status": "healthy",
          "latency_ms": 1
        },
      "queue":
        {
          "status": "healthy",
          "depth": 4,
          "dlq_depth": 0
        },
      "worker":
        {
          "status": "healthy",
          "last_job_at": "never",
          "jobs_processed": 0,
          "seconds_since_last_job": null
        }
      }
}
```

**Example response (503):**

```json
{
  "status": "unhealthy",
  "service": "waitlist",
  "timestamp": "2026-04-21T14:53:17.616Z",
  "uptime_seconds": 0,
  "checks":
    {
      "redis":
        {
          "status": "unhealthy",
          "error": "connection refused"
        },
      "queue":
        {
          "status": "unhealthy",
          "error": "connection refused"
        },
      "worker":
        {
          "status": "degraded",
          "last_job_at": "never",
          "jobs_processed": 0,
          "seconds_since_last_job": null
        }
      }
}
```

---


### Event Catalog


#### GET /health

```
GET /health

  Returns the health status of this service and its dependencies.

  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```

**Example request:**

```bash
curl http://catalog:3000/health
```

**Example response (200):**

```json
{
  "service_instance": "d21a7355ef08",
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" }
  }
}
```

**Example response (503):**

```json
{
  "status": "unhealthy",
  "checks": {
    "database": {
      "status": "healthy"
    },
    "redis": {
      "status": "unreachable"
    }
  }
}
```

#### GET /events

```
GET /events

  Returns a list of all events in the catalog.

  Responses:
    200  Successful response containing an array of events
    500  Internal Server Error
```

**Example request:**

```bash
curl http://catalog:3000/events
```

**Example response (200):**

```json
[
  {
    "id": 1,
    "name": "Laufey Tour",
    "venue": "Madison Square Garden",
    "date": "2025-05-05T15:55:55.000Z",
    "total_seats": 55000,
    "available_seats": 55000
  },
  {
    "id": 2,
    "name": "Boston Celtics vs. Thunder",
    "venue": "TD Garden",
    "date": "2023-04-15T12:35:00.000Z",
    "total_seats": 50000,
    "available_seats": 30000
  }
]
```

**Example response (500):**

```json
{
  "error": "Internal Server Error"
}
```

---

#### POST /events

```text
POST /events

  Creates a new event and its associated seats in the database using a transaction. Invalidates the events cache upon success.

  Request Body:
    {
      "name": String,
      "venue": String,
      "date": String (Timestamp),
      "total_seats": Number,
      "seats": Array of seat objects { section, row, seat_number }
    }

  Responses:
    201  Event and seats created successfully
    400  Missing or invalid parameters
    500  Internal Server Error
```

**Example request:**

```json
curl -X POST http://caddy:80/events \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kendrick Lamar Tour",
    "venue": "Gillette Stadium",
    "date": "2026-08-15 19:00:00",
    "total_seats": 4,
    "seats": [
      {"section": "GA", "row": "1", "seat_number": 1},
      {"section": "GA", "row": "1", "seat_number": 2},
      {"section": "VIP", "row": "A", "seat_number": 1},
      {"section": "VIP", "row": "A", "seat_number": 2}
    ]
  }'
```


**Example response (201):**

```json
{
  "message": "Event and seats created successfully",
  "event": {
    "id": 3,
    "name": "Kendrick Lamar Tour",
    "venue": "Gillette Stadium",
    "date": "2026-08-15T19:00:00.000Z",
    "total_seats": 4,
    "available_seats": 4
  }
}
```

---

#### GET /events/:id

```
GET /events/:id

  Returns details for a specific event by its ID.

  Responses:
    200  Successful response containing the event details
    404  Event not found
    500  Internal Server Error
```

**Example request:**

```bash
curl http://catalog:3000/events/1
```

**Example response (200):**

```json
{
  "id": 1,
  "name": "Laufey Tour",
  "venue": "Madison Square Garden",
  "date": "2025-05-05T15:55:55.000Z",
  "total_seats": 55000,
  "available_seats": 55000
}
```

**Example response (404):**

```json
{
  "error": "Event not found"
}
```

**Example response (500):**

```json
{
  "error": "Internal Server Error"
}
```

---

#### GET /events/:id/seats

```
GET /events/:id/seats

  Returns the seat map for a specific event by its ID.

  Responses:
    200  Successful response containing an array of seats
    500  Internal Server Error
```

**Example request:**

```bash
curl http://catalog:3000/events/1/seats
```

**Example response (200):**

```json
[
  {
    "id": 1,
    "section": "VIP",
    "row": "A",
    "seat_number": 1,
    "is_taken": false
  },
  {
    "id": 2,
    "section": "VIP",
    "row": "A",
    "seat_number": 2,
    "is_taken": false
  },
  {
    "id": 3,
    "section": "VIP",
    "row": "A",
    "seat_number": 3,
    "is_taken": false
  },
  {
    "id": 4,
    "section": "101",
    "row": "G",
    "seat_number": 15,
    "is_taken": false
  },
  {
    "id": 5,
    "section": "101",
    "row": "G",
    "seat_number": 16,
    "is_taken": false
  }
]
```

**Example response (500):**

```json
{
  "error": "Internal Server Error"
}
```

---

#### POST /events/:eventId/mark/:seatLabel

```
POST /events/:eventId/mark/:seatLabel

  Marks a specific seat as taken. Uses an atomic update to prevent race conditions.

  Responses:
    200  Successful response. Returns the updated seat data.
    404  Seat not found for this event.
    409  Conflict. Seat is already taken.
    500  Internal Server Error.


**Example request:**

```bash
curl -X POST http://catalog:3000/events/1/mark/A2
```

**Example response (200):**

```json
{
  "success": true,
  "message": "Seat A2 successfully marked as taken",
  "seat": {
    "id": 2,
    "section": "VIP",
    "row": "A",
    "seat_number": 2
  }
}
```

**Example response (409):**

```json
{
  "success": false,
  "error": "Seat A2 is already taken"
}
```


---


#### GET /events/:eventId/seats/:seatLabel

```
GET /events/:eventId/seats/:seatLabel

  Returns a boolean indicating whether a specific seat is taken, using its row and seat number label (e.g., A2, G15).

  Responses:
    200  Successful response containing true or false
    404  Seat not found for this event
    500  Internal Server Error

```


**Example request:**

```bash
curl http://catalog:3000/events/1/seats/A2
```

**Example response (200):**

```json
false
```

**Example response (404):**

```json
{
  "error": "Seat A2 not found for this event"
}
```


---
### Purchase

#### Primary Function:

Take an object of 

```
{
  user_id: String, 
  seat_number: String, 
  event_id: String,
  amount: String,
  currency: String
}
```

and transform it into:

```
{
  idempotency_key TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  event_id TEXT NOT NULL,
  amount: TEXT NOT NULL,
  currency: TEXT NOT NULL,
  purchase_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
}
```

in which ```purchase_id``` and ```created_at``` are default. This is added to the ```purchases``` database. Returns JSON of added entry along with a duplicate field, indicating if an entry of that user_id already exists on the database. Handles idempotency via ```idempotency_key```, in which on detecting an existing entry with the same ```user_id``` returns that entry along with code ```200```, else ```201```.

---

#### GET /health

```
GET /health

  Returns the health status of this service and its dependencies (redis and postgresql).

  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```

**Example request:**

```bash
curl http://purchase:9001/health
```

**Example response (200):**

```json
{
  "status": "healthy",
  "service": "unknown",
  "timestamp": "2026-05-04T17:47:09.997Z",
  "uptime_seconds": 80,
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 0
    },
    "redis": {
      "status": "healthy",
      "latency_ms": 1
    }
  }
}
```

**Example response (503):**

```json
{
  "status": "unhealthy",
  "service": "unknown",
  "timestamp": "2026-05-04T17:47:09.997Z",
  "uptime_seconds": 80,
  "checks": {
    "database": {
      "status": "healthy",
      "latency_ms": 0
    },
    "redis": {
      "status": "unhealthy",
      "error": "unexpected response: undefined"
    }
  }
}
```

---

#### POST /purchase

```
  Post a payload to be processed and placed on purchases queue. Can manually set idempotency_key by adding the field before user_id.

  Request:
    {
      user_id: String,
      seat_number: String,
      event_id: String
      amount: String,
      currency: String
    }
  
  Responses:
    201 New entry, added to database.
      {
        duplicate: false,
        user_id,
        seat_number,
        event_id,
        amount: String,
        currency: String
        purchase_id,
        created_at
      }
    202 Seat taken, not added.
      {
        added_to_waitlist: true
      }
    200 Duplicate entry (determined by idempotency_key), not added.
      {
        duplicate: true,
      }
```

**Example request:**

```bash
curl -s -X POST http://localhost/purchase/purchase -H "Content-Type: application/json" -d '{"user_id": "2", "seat_number": "A1", "event_id": "1", "amount": "10", "currency": "PHP"}'
```

**Example Response (201)**
```json
  {
    "duplicate": true,
    "user_id": "1e1",
    "seat_number": "a2",
    "event_id": "cool",
    "amount": "200",
    "currency": "PHP",
    "purchase_id": "5b30857f-0bfa-48b5-ac0b-5c64e28078d1",
    "created_at": "2023-03-16 16:35:20.703644+11"
  }
```

**Example Response (202)**
```json
  {
    "added_to_waitlist": true
  }
```

**Example request (Manual Idempotency Key Entry):**

```bash
curl -s -X POST http://localhost/purchase/purchase -H "Content-Type: application/json" -d '{"idempotency_key":"7a6173a6-c2ed-488a-81ee-ac2738554daa", "user_id": "2", "seat_number": "A2", "event_id": "1", "amount": "10", "currency": "PHP"}'
```

**Example Response (200)**
```json
  {
    "duplicate": true
  }
```

---

#### GET /fetch_purchase

```
  Retrieves an entry via user_id and purchase_id.

  Request:
    {
      user_id,
      purchase_id
    }

  Responses:
    201 Successfully retrieved
      {
        user_id,
        seat_number,
        event_id,
        amount,
        currency,
        purchase_id,
        created_at
      }
    200 Failed to fetch
      {
        user_id,
        purchase_id,
        err
      }
```

**Example Request**
```bash
curl -s -X GET http://localhost/purchase/fetch_purchase -H "Content-Type: application/json" -d '{"user_id": "2", "purchase_id":"912cb938-6e5a-403c-8dec-8532c94ffaba"}'
```

**Example Response (201)**
```json
  {
    "user_id": "2",
    "seat_number": "A1",
    "event_id": "1",
    "amount": "10",
    "currency": "PHP",
    "purchase_id": "912cb938-6e5a-403c-8dec-8532c94ffaba","created_at": "2026-05-04T19:08:08.829Z"
  }
```

**Example Response (200)**
```json
  {
    "user_id": "1",
    "purchase_id": "912cb938-6e5a-403c-8dec-8532c94ffaba",
    "err": {}
  }
```

---

##### GET /dump_db

```
  Dumps purchases database.

  Responses:
    200
    {
      rows: all database rows
    }
```

**Example Request**
```bash
  curl http://localhost/purchase/dump_db 
```

**Example Response (200)**
```json
  {
    "rows":
    [
      {
        "idempotency_key": "7a6173a6-c2ed-488a-81ee-ac2738554daa",
        "user_id": "2",
        "seat_number": "A1",
        "event_id": "1",
        "amount": "10",
        "currency": "PHP",
        "purchase_id": "912cb938-6e5a-403c-8dec-8532c94ffaba",
        "created_at": "2026-05-04T19:08:08.829Z"
      },
      {
        "idempotency_key": "4317d820-c774-4805-a50b-7920d8f9e1c4",
        "user_id": "3",
        "seat_number": "A3",
        "event_id": "1",
        "amount": "10",
        "currency": "PHP",
        "purchase_id": "69fd870d-3f02-4021-9a4d-5a3077444698",
        "created_at": "2026-05-04T19:25:01.165Z"
      },
      {
        "idempotency_key": "c421fdd0-d6cc-4d60-954e-fdab523b18d8",
        "user_id": "6",
        "seat_number": "A2",
        "event_id": "2",
        "amount": "11",
        "currency": "PHP",
        "purchase_id": "60f0d83d-b519-4d16-a467-200247397931",
        "created_at": "2026-05-04T19:26:35.503Z"
      },
      {
        "idempotency_key": "35e48ef5-1a15-49d2-82ef-9424753bd9a5",
        "user_id": "60",
        "seat_number": "b5",
        "event_id": "2",
        "amount": "11",
        "currency": "PHP",
        "purchase_id": "286551c7-0a62-4245-afc3-59720d842b2f",
        "created_at": "2026-05-04T19:27:01.956Z"
      }
    ]
  }
```
---


### Refund

#### GET /health
```
GET /health

  Returns the health status of this service and its dependencies.

  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```

**Example request:**
```bash
curl http://refund:3000/health
```
**Example response (200):**

```json
{
  "checks" : {
    "database" : {
      "latency_ms" : 1,
      "status" : "healthy"
    },
    "redis" : {
      "latency_ms" : 0,
      "status" : "healthy"
    }
  },
  "service" : "refund",
  "status" : "healthy",
  "timestamp" : "2026-04-21T14:40:45.373Z",
  "uptime_seconds" : 349
}
```

**Example Response (503)**
```json
{
  "checks" : {
    "database" : {
      "error" : "getaddrinfo ENOTFOUND refund-db",
      "status" : "unhealthy"
    },
    "redis" : {
      "latency_ms" : 1,
      "status" : "healthy"
    }
  },
  "service" : "refund",
  "status" : "unhealthy",
  "timestamp" : "2026-04-21T14:44:35.723Z",
  "uptime_seconds" : 22
}
```

#### POST /refund

**Example Request**
```bash
curl -X POST http://refund:3000/refund \
  -H "Content-Type: application/json" \
  -d '{"purchase_id": "test_key_1", "user_id": "test_user_id_1"}' 
```

**Example Response (400)** (if the object passed to curl's -d option was missing "purchase_id" or "user_id"):
```json
  {"error":"Missing required fields: user_id and purchase_id"}
```
**Example Response (409)** (if the "purchase_id" had already been refunded):
```json
  {"error":"Purchase has already been refunded"}
```
**Example Response (500)** (if the refund database was down):
```json
  {"error":"Database error while checking refund status"}
```
**Example Response (502)** (if the refund payment itself failed):
```json
  {"error":"Payment refund failed", "details": "Payment error"}
```
**Example Response (503)** (if the payment service is unreachable):
```json
  {"error":"Payment service unreachable"}
```
**Example Response (200)** (if the payment service is unreachable):
```json
  {"message":"Refund successful and seat released"}
```

---

### Payment

> **Replication:** The payment service is stateless and supports horizontal scaling. It has no `container_name` and no host port binding, so multiple replicas can run without collision. Caddy distributes traffic across all replicas via round-robin at `/payment/*`. Each replica identifies itself via `os.hostname()` — visible in `/health` as `service_instance`.
>
> ```bash
> # Start with 3 replicas
> docker compose up --scale payment=3 -d
>
> # Verify all replicas are healthy
> docker compose ps | grep payment
>
> # Confirm round-robin from inside holmes
> for i in $(seq 1 9); do curl -s http://caddy/payment/health | jq .service_instance; done
> ```

#### GET /health

```
GET /health

  Returns the health status of this replica and its Redis dependency.
  service_instance identifies which replica responded — useful when scaled.

  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```

**Example request:**

```bash
curl http://payment:3000/health
# or via Caddy (round-robins across replicas):
curl http://localhost/payment/health
```

**Example response (200):**

```json
{
  "status": "healthy",
  "service": "payment",
  "service_instance": "event-ticketing-payment-2",
  "timestamp": "2026-04-21T15:00:00.000Z",
  "uptime_seconds": 120,
  "checks": {
    "redis": {
      "status": "healthy",
      "latency_ms": 1
    }
  }
}
```

**Example response (503):**

```json
{
  "status": "unhealthy",
  "service": "payment",
  "service_instance": "event-ticketing-payment-1",
  "timestamp": "2026-04-21T15:00:00.000Z",
  "uptime_seconds": 5,
  "checks": {
    "redis": {
      "status": "unhealthy",
      "latency_ms": 0
    }
  }
}
```

---

#### POST /payment

```
POST /payment

  Processes a payment for a given amount using the provided payment token.
  A payment_token beginning with "fail" will simulate a failed payment.

  Request body:
    {
      "amount":        Number  (required),
      "payment_token": String  (required)
    }

  Responses:
    200  Payment processed (check "success" field for result)
    400  Missing or invalid fields
```

**Example request:**

```bash
curl -X POST http://payment:3000/payment \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99, "payment_token": "tok_abc123"}'
```

**Example response (200 — success):**

```json
{
  "success": true,
  "transaction_id": "txn_1713711600000"
}
```

**Example response (200 — failure):**

```json
{
  "success": false,
  "transaction_id": null
}
```

**Example response (400):**

```json
{
  "error": "amount and payment_token are required"
}
```

---

#### POST /refunds

```
POST /refunds

  Processes a refund for a prior purchase.
  A user_id beginning with "fail" will simulate a failed refund.

  Request body:
    {
      "user_id":     String  (required),
      "purchase_id": String  (required),
      "amount":      Number  (required),
      "currency":    String  (required)
    }

  Responses:
    200  Refund processed (check "success" field for result)
    400  Missing or invalid fields
```

**Example request:**

```bash
curl -X POST http://payment:3000/refunds \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_42", "purchase_id": "purch_99", "amount": 99.99, "currency": "USD"}'
```

**Example response (200 — success):**

```json
{
  "success": true,
  "refund_id": "ref_1713711600000",
  "message": "Refund processed successfully"
}
```

**Example response (200 — failure):**

```json
{
  "success": false,
  "refund_id": null,
  "message": "Refund failed"
}
```

**Example response (400):**

```json
{
  "error": "user_id, purchase_id, amount, and currency are required"
}
```

---

### GET /health
```
GET /health
  Returns the health status of this service and its dependencies.
  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```
**Example request:**
```bash
curl http://localhost:[port]/health
```
**Example response (200):**
```json
{
  "status": "healthy",
  "db": "ok",
  "redis": "ok"
}
```
**Example response (503):**
```json
{
  "status": "unhealthy",
  "db": "ok",
  "redis": "error: connection refused"
}
```
---

### Analytics Worker

#### GET /health
```
GET /health
  Returns the health status of the analytics worker and its dependencies.
  Responses:
    200  Worker healthy, Redis connected
```

**Example request:**
```bash
curl http://localhost:3005/health
```

**Example response (200):**
```json
{
  "status": "healthy",
  "service": "analytics-worker",
  "redis": "ok",
  "depth": 0,
  "dlq_depth": 0,
  "jobs_processed": 1,
  "last_job_at": "2026-04-21T10:20:48.094Z"
}
```

#### Redis Queue Interface
```
Queue name: analytics:queue
DLQ name:   analytics:dlq
Message shape: { "type": "purchase" | "browse", "eventId": "<event-id>" }
```

**Push a test event (from holmes):**
```bash
docker compose exec redis redis-cli RPUSH analytics:queue '{"type":"purchase","eventId":"event-123"}'
```

### Frontend
#### GET /
```
GET /
    Returns a basic HTML page that can be used to monitor what is happening in the system.

    Responses:
        200   Service is working correctly
        500   One or more dependencies failed
```
Example request:
```
curl http://localhost/
```
Example response (200):
```html
<!DOCTYPE HTML>
...
```
#### Get /health
```
GET /health
    Returns the health of this service.

    Responses:
        200   Service is working correctly
        500   One or more dependencies failed
```
Example response (200):
```json
{
    "status": "healthy",
    "service": "frontend"
}
```


---

## Fraud Detection

#### GET /health

```
GET /health

  Returns the health status of this worker, the status of the Purchase redis queue and its depth, and DLQ depth

  Responses:
    200  Worker and all dependencies healthy
    503  One or more dependencies unreachable
```

**Example request:**

```bash
curl http://fraud-detection:9002/health
```

**Example response (200):**

```json
{
  "status": "healthy",
  "service": "fraud-detection",
  "created_at": "2026-04-21T14:53:17.616Z",
  "checks":
    {
      "redis":
        {
          "status": "healthy",
          "latency_ms": 1
        },
      "queue":
        {
          "status": "healthy",
          "depth": 4,
          "dlq_depth": 0
        },
      }
}
```

**Example response (503):**

```json
{
  "status": "unhealthy",
  "service": "fraud-detection",
  "created_at": "2026-04-21T14:53:17.616Z",
  "checks":
    {
      "redis":
        {
          "status": "unhealthy",
          "error": "connection refused"
        },
      "queue":
        {
          "status": "unhealthy",
          "error": "connection refused"
        },
      }
}
```

---
## Sprint History
| Sprint | Tag        | Plan                                              | Report                                    |
| ------ | ---------- | ------------------------------------------------- | ----------------------------------------- |
| 1      | `sprint-1` | [SPRINT-1-PLAN.md](sprint-plans/SPRINT-1-PLAN.md) | [SPRINT-1.md](sprint-reports/SPRINT-1.md) |
| 2      | `sprint-2` | [SPRINT-2-PLAN.md](sprint-plans/SPRINT-2-PLAN.md) | [SPRINT-2.md](sprint-reports/SPRINT-2.md) |
| 3      | `sprint-3` | [SPRINT-3-PLAN.md](sprint-plans/SPRINT-3-PLAN.md) | [SPRINT-3.md](sprint-reports/SPRINT-3.md) |
| 4      | `sprint-4` | [SPRINT-4-PLAN.md](sprint-plans/SPRINT-4-PLAN.md) | [SPRINT-4.md](sprint-reports/SPRINT-4.md) |
