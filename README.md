# Team Cache Flow Ticketing — Event Ticketing

**Course:** COMPSCI 426

**Team:** Enver Amboy, Hayun Jung, Daniel Brown, Michael Ye, Arush Rastogi, Casey Hammill, Edison Zheng, Mihir Nagarkatti, Mahad Mushtaq

**System:** Event Ticketing 

**Repository:** https://github.com/ArRstgi/Team-Cache-Flow-Ticketing

---

## Team and Service Ownership

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
```

### Base URLs (development)

```
catalog       http://localhost:3001
payment       http://localhost:3002
notification  http://localhost:3003
waitlist      http://localhost:3010
purchase      http://localhost:9001
refund        http://localhost:3004
holmes        (no port — access via exec)
frontend      http://localhost:80
```

> From inside holmes, services are reachable by their Docker service name:
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

<!-- Add the rest of your endpoints below. One ### section per endpoint. -->

---

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

| Sprint | Tag        | Plan                                              | Report                                    |
| ------ | ---------- | ------------------------------------------------- | ----------------------------------------- |
| 1      | `sprint-1` | [SPRINT-1-PLAN.md](sprint-plans/SPRINT-1-PLAN.md) | [SPRINT-1.md](sprint-reports/SPRINT-1.md) |
| 2      | `sprint-2` | [SPRINT-2-PLAN.md](sprint-plans/SPRINT-2-PLAN.md) | [SPRINT-2.md](sprint-reports/SPRINT-2.md) |
| 3      | `sprint-3` | [SPRINT-3-PLAN.md](sprint-plans/SPRINT-3-PLAN.md) | [SPRINT-3.md](sprint-reports/SPRINT-3.md) |
| 4      | `sprint-4` | [SPRINT-4-PLAN.md](sprint-plans/SPRINT-4-PLAN.md) | [SPRINT-4.md](sprint-reports/SPRINT-4.md) |
