# Sprint 1 Report — Team-Cache-Flow-Ticketing

**Sprint:** 1 — Foundation  
**Tag:** `sprint-1`  
**Submitted:** April 14, 2026

---

## What We Built

In Sprint 1, we laid the foundational infrastructure for the Event Ticketing Platform. The system is composed of multiple independently containerized services wired together via Docker Compose, including the Event Catalog Service, Ticket Purchase Service, Payment Service, Refund Service, and Notification Service, all backed by their respective databases and a shared Redis instance for caching, queuing, and pub/sub. A simple frontend dashboard is also running for visibility into system activity.

Running `docker compose up` brings up the full service mesh. Each core service exposes a `/health` endpoint confirming database and Redis connectivity. The Payment Service is reachable synchronously from the Ticket Purchase Service, and the Notification Service is wired to listen on the Redis pub/sub channel for confirmed purchases.

---

## Individual Contributions

| Team Member      | What They Delivered                                                                    | Key Commits                     |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| Mihir Nagarkatti | Initial Docker services skeleton, folder structure, compose refactor                  | `b444523`, `a35cc98`, `46a82b9` |
| Edison Zheng     | Refund Service with health endpoint, DB schema, and idempotency handling              | `526e280`, `c0917c3`            |
| Casey Hammill    | k6 baseline load test script, p50/p90 metrics, test file cleanup                     | `5b65104`, `426e5e2`, `49d941a` |
| Arush Rastogi    | Payment Service implementation, ioredis dependency, healthcheck and depends_on wiring | `0154124`, `d5064e5`, `68f0853` |
| Daniel Brown     | Frontend dashboard (read-only visibility layer)                                        | `277a322`, `22b9fd6`            |
| Michael Ye       | Event Catalog Service with events DB, seat map logic, and Redis caching               | `5b0eda0`, `c80d3b5`            |
| Enver Amboy      | Ticket Purchase Service, health check, compose.yml wiring, purchase DB integration   | `79f0e6f`, `06db6c6`, `d5ec5ca` |
| Hayun Jung       | README with team and project details, Notification Service                            | `f5312f5`, PR (`notification`)  |
| Mahad Mushtaq    | Sprint 1 report                                                                        | —                               |

Verify with:
```bash
git log --author="Name" --oneline -- path/to/directory/
```

---

## What Is Working

- [ ] `docker compose up` starts all services without errors
- [ ] `docker compose ps` shows every service as `(healthy)`
- [ ] `GET /health` on every service returns `200` with DB and Redis status
- [ ] At least one synchronous service-to-service call works end-to-end
- [ ] k6 baseline test runs successfully

---

## What Is Not Working / Cut

The following components were not assigned or completed in Sprint 1 and are deferred to Sprint 2:

- **Waitlist Worker** — not yet implemented; waitlist promotion logic and dead letter queue handling planned for Sprint 2
- **Analytics Worker** — not yet implemented; aggregate stats pipeline deferred to Sprint 2
- **Fraud Detection Worker** — not yet implemented; suspicious pattern detection deferred to Sprint 2
- **Caddy load balancer** — not yet configured in front of replicated services; planned for Sprint 2
- **Frontend dashboard** (`feature-frontend`) and **Notification Service** (`notification`) branches not yet merged into `dev`

---

## k6 Baseline Results

Script: `k6/sprint-1.js`  
Run: `docker compose exec holmes k6 run /workspace/k6/sprint-1.js`

```
[Paste the k6 summary output here]
```

| Metric             | Value |
| ------------------ | ----- |
| p50 response time  |       |
| p95 response time  |       |
| p99 response time  |       |
| Requests/sec (avg) |       |
| Error rate         |       |

These numbers are your baseline. Sprint 2 caching should improve them measurably.

---

## Blockers and Lessons Learned

[What slowed you down? What would you do differently? What surprised you?]
