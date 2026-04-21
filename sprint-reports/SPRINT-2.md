# Sprint 2 Report — Team-Cache-Flow-Ticketing

**Sprint:** 2 — Async Pipelines and Caching
**Tag:** `sprint-2`
**Submitted:** April 21, 2026

---

## What We Built

Sprint 2 added the async backbone to the system. The Event Catalog Service now reads from a Redis cache before hitting the database, so repeated browses on the same event don't hammer Postgres. The async pipeline is live — when a purchase is confirmed, an event gets pushed to the analytics queue, and the analytics worker consumes it and writes aggregate stats to its own database. The waitlist worker is also running, promoting the next user when a seat is released via the refund pub/sub channel. Fraud detection is up and consuming purchase events. The notification service got a Redis cache check added to its health endpoint.

Running `docker compose up` brings up the full system including the new analytics worker, waitlist worker, fraud detection service, and their respective databases.

---

## Individual Contributions

| Team Member      | What They Delivered                                                                                                        | Key Commits                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Mihir Nagarkatti | Refund POST endpoint, payment/purchase service integration, DTO alignment, malformed input handling                       | `4608f47`, `4ac54d0`, `5275b9c` |
| Edison Zheng     | Waitlist queue processing, health endpoint, pub/sub subscriber for seat.released channel                                  | `9f797f1`, `84eecbf`, `d730bc2` |
| Casey Hammill    | Fraud detection pipeline, Sprint 2 k6 test files, Sprint 2 plan                                                          | `dc03d67`, `d7abe9a`, `e190e45` |
| Arush Rastogi    | Payment service update, refund flow integration, service-to-service HTTP calls                                            | `eee91e2`, `7e0dc26`, `aa7e009` |
| Daniel Brown     | Frontend monitoring dashboard updates                                                                                      | `1a9322a`                       |
| Michael Ye       | Redis cache-aside layer for Event Catalog — caching /events, /events/:id, /events/:id/seats                              | `4278b35`, `81c0a3e`            |
| Enver Amboy      | Purchase DB functionality, notifications integration in compose                                                           | `15c25a3`, `54bcd9f`            |
| Hayun Jung       | Redis cache check added to notification service health endpoint                                                           | `f5edd67`                       |
| Mahad Mushtaq    | Analytics worker — Redis queue consumer, Postgres DB with idempotent upserts, health endpoint, DLQ handling; Sprint 2 report | `2869026`                    |

---

## What Is Working

- [ ] Redis cache in use — repeated reads do not hit the database
- [ ] Async pipeline works end-to-end (message published → worker consumes → action taken)
- [ ] At least one write path is idempotent (same request twice produces same result)
- [ ] Worker logs show pipeline activity in `docker compose logs`
- [ ] Worker `GET /health` returns queue depth, DLQ depth, and last-job-at

---

## What Is Not Working / Cut

- k6 baseline results from Sprint 1 were not collected due to placeholder URLs in the test script — the before/after caching comparison is therefore incomplete for this sprint
- Analytics worker PR (#42) is open and awaiting review/merge into dev at time of submission

---

## k6 Results

### Test 1: Caching Comparison (`k6/sprint-2-cache.js`)

| Metric | Sprint 1 Baseline | Sprint 2 Cached | Change |
| ------ | ----------------- | --------------- | ------ |
| p50    |                   |                 |        |
| p95    |                   |                 |        |
| p99    |                   |                 |        |
| RPS    |                   |                 |        |

Sprint 1 baseline numbers were not captured due to the k6 script still having placeholder URLs at submission time. Sprint 2 cache test results to be filled in once Casey's k6 scripts are confirmed working against live endpoints.

### Test 2: Async Pipeline Burst (`k6/sprint-2-async.js`)

```
[Paste k6 summary output here]
```

Worker health during the burst (hit `/health` while k6 is running):

```json
[Paste an example health response showing non-zero queue depth]
```

Idempotency check: The analytics worker handles duplicate purchase events via `INSERT ON CONFLICT DO UPDATE` — sending the same `eventId` twice increments the counter rather than creating a duplicate row. The refund service uses `purchase_id` as an idempotency key — sending the same refund request twice returns the existing record without reversing the charge a second time. The purchase service uses `user_id` as an idempotency key — duplicate requests return the existing entry with `duplicate: true`.

---

## Blockers and Lessons Learned

The biggest carryover blocker from Sprint 1 was the k6 script never getting updated with real service URLs, which meant we couldn't get baseline numbers and the before/after comparison for caching is incomplete. Going into Sprint 3 that needs to be the first thing locked down.

On the workflow side, branches diverged a lot again this sprint — several PRs had merge conflicts on compose.yml which slowed down integration. We're getting better at it but still need to merge into dev more frequently rather than letting branches sit for days.

The async pipeline itself came together well. The analytics worker, waitlist worker, and refund pub/sub flow are all working end-to-end locally.
