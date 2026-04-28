# Team Cache Flow Ticketing — Event Ticketing
**Course:** COMPSCI 426
**Team:** Enver Amboy, Hayun Jung, Daniel Brown, Michael Ye, Arush Rastogi, Casey Hammill, Edison Zheng, Mihir Nagarkatti, Mahad Mushtaq
**System:** Event Ticketing 
**Repository:** https://github.com/ArRstgi/Team-Cache-Flow-Ticketing
---
## Team and Service Ownership
| Team Member | Services / Components Owned                            |
| ----------- | ------------------------------------------------------ |
| Mihir Nagarkatti | Compose/Docker Skeleton/Sprint Plan  |
| Edison Zheng     | `refund/`                |
| Casey Hammill    | `k6/`                    |
| Arush Rastogi    | `payment/`               |
| Daniel Brown     | `frontend/`              |
| Michael Ye       | `catalog/`               |
| Enver Amboy      | `purchase/`              |
| Hayun Jung       | `notifications/`         |
| Mahad Mushtaq    | `analytics-worker/`, Sprint Reports |

| Team Member | Files / Directories Owned in Sprint 2 |
| ----------- | ------------------------------------- |
| Enver Amboy      | `purchases` |
| Arush Rastogi    | `payment` |
| Hayun Jung       | `notifications` |
| Mihir Nagarkatti | `refund` |
| Casey Hammill    | `k6`, `fraud-detection`|
| Michael Ye       | `event-catalog`|
| Mahad Mushtaq    | `analytics-worker`|
| Edison Zheng     | `waitlist-worker`|
| Daniel Brown     | `frontend`|


> Ownership is verified by `git log --author`. Each person must have meaningful commits in the directories they claim.
---
## How to Start the System
```bash
# Start everything (builds images on first run)
docker compose up --build
# Start with service replicas (Sprint 4)
docker compose up --scale your-service=3
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
catalog          http://localhost:3001
payment          http://localhost:3002
notification     http://localhost:3003
waitlist         http://localhost:3010
purchase         http://localhost:9001
fraud-detection  http://localhost:9002
analytics        http://localhost:3005
refund           (no host port — internal only)
refund           http://localhost:3004
holmes           (no port — access via exec)
frontend         http://localhost:80
```
> From inside holmes, services are reachable by their Docker service name:
> `curl http://catalog:3000/health`
> `curl http://payment:3000/health`
> `curl http://purchase:9001/health`
> `curl http://fraud-detection:9002/health`
> `curl http://refund:3001/health`
> `curl http://analytics:3005/health`
> curl http://catalog:3000/health
> curl http://purchase:9001/health
> curl http://payment:3000/health
> curl http://notification:3000/health
> curl http://waitlist:3010/health
> curl http://refund:3000/health
> curl http://frontend:3010/health
>
> See [holmes/README.md](holmes/README.md) for a full tool reference.
---
## System Overview
N/A

[TODO]

---
## API Reference
<!--
  Document every endpoint for every service.
  Follow the format described in the project documentation: compact code block notation, then an example curl and an example response. Add a level-2 heading per service, level-3 per endpoint.
-->
N/A
---
### [Service Name]

### [Waitlist]

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
  "status": "healthy",
  "checks": {
    "database": {
      "status": "healthy"
    },
    "redis": {
      "status": "healthy"
    }
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
  user_id TEXT UNIQUE NOT NULL,
  seat_number TEXT NOT NULL,
  event_id TEXT NOT NULL,
  amount: TEXT NOT NULL,
  currency: TEXT NOT NULL,
  purchase_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
}
```

in which ```purchase_id``` and ```created_at``` are default. This is added to the ```purchases``` database. Returns JSON of added entry along with a duplicate field, indicating if an entry of that user_id already exists on the database. Handles idempotency via ```user_id```, in which on detecting an existing entry with the same ```user_id``` returns that entry along with code ```200```, else ```201```.

#### Endpoints:

##### GET /health

```
GET /health

  Returns the health status of this service and its dependencies (redis and postgresql).

  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```

##### GET /

```
GET /

  Returns HTML Purchase is Online!
```

##### POST /purchase

```
  Post a payload to be processed and placed on purchases queue.

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
    200 Duplicate entry (determined by user_id), not added.
    {
      duplicate: true,
      user_id,
      seat_number,
      event_id,
      amount: String,
      currency: String
      purchase_id,
      created_at
    }
```

###### Example Request
```
  {
    user_id: 1e1,
    seat_number: a2,
    event_id: cool,
    amount: 200,
    currency: PHP
  }
```

###### Example Response
```
  {
    duplicate: true,
    user_id: 1e1,
    seat_number: a2,
    event_id: cool,
    amount: 200,
    currency: PHP,
    purchase_id: 5b30857f-0bfa-48b5-ac0b-5c64e28078d1,
    created_at: 2023-03-16 16:35:20.703644+11
  }
```

##### GET /manual_test

```
  Allows for manual entry of payload to be sent to /purchase.
```

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

###### Example Request
```
  {
    user_id: 1e1,
    purchase_id: 5b30857f-0bfa-48b5-ac0b-5c64e28078d1
  }
```

###### Example Response
```
  {
    duplicate: true
    user_id: 1e1,
    seat_number: a2,
    event_id: cool,
    amount: 200,
    currency: PHP,
    purchase_id: 5b30857f-0bfa-48b5-ac0b-5c64e28078d1,
    created_at: 2023-03-16 16:35:20.703644+11
  }
```

##### GET /dump_db

```
  Dumps purchases database.

  Responses:
    200
    {
      rows: all database rows
    }
```

###### Example Response
```
  {
    rows: [
      {
        user_id: 1e1
        seat_number: a2
        event_id: cool
        purchase_id: 5b30857f-0bfa-48b5-ac0b-5c64e28078d1
        created_at: 2023-03-16 16:35:20.703644+11
      },
      {
        user_id: d21
        seat_number: a3
        event_id: swag
        purchase_id: 5b30857f-0bfa-48b5-ac0b-5c64e28078d1
        created_at: 2023-03-16 16:35:20.703644+11
      },
    ]
  }
```
---

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
    "seat_number": 1
  },
  {
    "id": 2,
    "section": "VIP",
    "row": "A",
    "seat_number": 2
  },
  {
    "id": 3,
    "section": "VIP",
    "row": "A",
    "seat_number": 3
  },
  {
    "id": 4,
    "section": "101",
    "row": "G",
    "seat_number": 15
  },
  {
    "id": 5,
    "section": "101",
    "row": "G",
    "seat_number": 16
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

#### GET /health

```
GET /health

  Returns the health status of this service and its Redis dependency.

  Responses:
    200  Service and all dependencies healthy
    503  One or more dependencies unreachable
```

**Example request:**

```bash
curl http://payment:3000/health
```

**Example response (200):**

```json
{
  "status": "healthy",
  "service": "payment",
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

## Analytics Worker

### GET /health
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

## Sprint History

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

### Redis Queue Interface
```
Queue name: analytics:queue
DLQ name:   analytics:dlq
Message shape: { "type": "purchase" | "browse", "eventId": "<event-id>" }
```

**Push a test event (from holmes):**
```bash
docker compose exec redis redis-cli RPUSH analytics:queue '{"type":"purchase","eventId":"event-123"}'
```

---
<!-- Add the rest of your endpoints below. One ### section per endpoint. -->
---
## Sprint History
| Sprint | Tag        | Plan                                              | Report                                    |
| ------ | ---------- | ------------------------------------------------- | ----------------------------------------- |
| 1      | `sprint-1` | [SPRINT-1-PLAN.md](sprint-plans/SPRINT-1-PLAN.md) | [SPRINT-1.md](sprint-reports/SPRINT-1.md) |
| 2      | `sprint-2` | [SPRINT-2-PLAN.md](sprint-plans/SPRINT-2-PLAN.md) | [SPRINT-2.md](sprint-reports/SPRINT-2.md) |
| 3      | `sprint-3` | [SPRINT-3-PLAN.md](sprint-plans/SPRINT-3-PLAN.md) | [SPRINT-3.md](sprint-reports/SPRINT-3.md) |
| 4      | `sprint-4` | [SPRINT-4-PLAN.md](sprint-plans/SPRINT-4-PLAN.md) | [SPRINT-4.md](sprint-reports/SPRINT-4.md) |
