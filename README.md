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
```
### Base URLs (development)
```
catalog       http://localhost:3001
payment       http://localhost:3002
notification  http://localhost:3003
purchase      http://localhost:9001
analytics     http://localhost:3005
refund        (no host port — internal only)
holmes        (no port — access via exec)
```
> From inside holmes, services are reachable by their Docker service name:
> `curl http://catalog:3000/health`
> `curl http://payment:3000/health`
> `curl http://purchase:9001/health`
> `curl http://refund:3001/health`
> `curl http://analytics:3005/health`
>
> See [holmes/README.md](holmes/README.md) for a full tool reference.
---
## System Overview
N/A
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
