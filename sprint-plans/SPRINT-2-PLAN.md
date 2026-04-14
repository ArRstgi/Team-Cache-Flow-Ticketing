# Sprint 2 Plan — Team Cache Flow Ticketing

**Sprint:** 2 — Async Pipelines and Caching  
**Dates:** 04.14 → 04.21  
**Written:** 04.14 in class

---

## Goal

Implement redis cache, and proper communication between services. As well as implementation of worker and database services.

---

## Ownership

| Team Member | Files / Directories Owned This Sprint |
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

---

## Tasks

### Add Redis Cache

### Implement Async Pipeline

### Write Path Idempotency

### Worker Health Endpoint


---

## Definition of Done

A TA can trigger an action, watch the queue flow in Docker Compose logs, hit the worker's `/health` to see queue depth and last-job-at, and review k6 results showing the caching improvement.
