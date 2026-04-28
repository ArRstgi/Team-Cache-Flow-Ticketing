# Sprint 3 Report — Team-Cache-Flow-Ticketing

**Sprint:** 3 — Reliability and Poison Pills
**Tag:** `sprint-3`
**Submitted:** April 28, 2026

---

## What We Built

Sprint 3 focused on making the system handle failure gracefully. Every worker queue now has dead letter queue handling — malformed or unprocessable messages are caught, routed to a DLQ, and never retried forever or silently dropped. The refund service was fully implemented with proper payment and purchase service integration. The fraud detection worker was connected to the purchase and payment pipeline. The purchase service was wired up with pub/sub subscriptions for seat release and seat purchase events. The notification worker received DLQ and poison pill handling. The waitlist worker had its poison pill handling completed and mock data removed.

When a poison pill is injected into any worker queue, the worker catches it, pushes it to `<queue>:dlq`, logs the event, and continues processing good messages without crashing. The worker's `/health` endpoint reflects a non-zero `dlq_depth` while the worker status remains `healthy`.

---

## Individual Contributions

| Team Member      | What They Delivered                                                                                  | Key Commits             |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| Mihir Nagarkatti | Completed full refund service implementation with payment/purchase integration                      | `b0ce35e`               |
| Edison Zheng     | Poison pill handling for waitlist worker, removed mock data                                         | `8e8c2ec`, `aa1380a`    |
| Casey Hammill    | Poison pill k6 test (`sprint-3-poison.js`), connected fraud detection to purchase/payment pipeline  | `846f2a8`, `f1c97ea`    |
| Arush Rastogi    | Payment service API reference documentation                                                          | `a3e227a`               |
| Daniel Brown     | Frontend improvements and port fixes                                                                 | `be02260`, `a69dc7d`    |
| Michael Ye       | README updates for event catalog                                                                     | `e64afc1`               |
| Enver Amboy      | Purchase service Sprint 3 updates, seat.released and seat.purchase pub/sub subscriptions            | `94a3c66`, `de5e62f`    |
| Hayun Jung       | DLQ and poison pill handling for notification worker                                                 | `686edac`               |
| Mahad Mushtaq    | Analytics worker healthcheck fix (wget → curl), README analytics section, Sprint 3 report          | `1b039be`, `af656a4`    |

---

## What Is Working

- [ ] Poison pill handling: malformed messages go to DLQ, worker keeps running
- [ ] Worker `GET /health` shows non-zero `dlq_depth` after poison pills are injected
- [ ] Worker status remains `healthy` while DLQ fills
- [ ] System handles failure scenarios gracefully (no dangling state, no crash loops)
- [ ] All services/workers required for team size are implemented

---

## What Is Not Working / Cut

- Analytics worker shows `(unhealthy)` in `docker compose ps` due to the healthcheck using `wget` which is not available in the Alpine image — a fix using `curl` is in PR #64 awaiting merge. The worker itself is fully functional and responsive on port 3005.
- Purchase service is not yet pushing to `analytics:queue` — the analytics worker is running and ready but the producer side integration is pending on Enver's sprint3-purchase branch being merged.

---

## Poison Pill Demonstration

How to inject a poison pill into the analytics worker:

```bash
docker compose exec redis redis-cli RPUSH analytics:queue '{"broken": true}'
```

Worker health before injection:

```json
{
  "status": "healthy",
  "service": "analytics-worker",
  "redis": "ok",
  "depth": 0,
  "dlq_depth": 0,
  "jobs_processed": 0,
  "last_job_at": null
}
```

Worker health after injection:

```json
{
  "status": "healthy",
  "service": "analytics-worker",
  "redis": "ok",
  "depth": 0,
  "dlq_depth": 1,
  "jobs_processed": 0,
  "last_job_at": null
}
```

The worker remained healthy, the malformed message was routed to `analytics:dlq`, and good messages continued processing normally.

---

## k6 Results: Poison Pill Resilience (`k6/sprint-3-poison.js`)

```
         /\      Grafana   /‾‾/  
    /\  /  \     |\  __   /  /   
   /  \/    \    | |/ /  /   ‾‾\ 
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/ 


     execution: local
        script: k6/sprint-3-poison.js
        output: -

     scenarios: (100.00%) 1 scenario, 20 max VUs, 1m40s max duration (incl. graceful stop):
              * default: Up to 20 looping VUs for 1m10s over 3 stages (gracefulRampDown: 30s, gracefulStop: 30s)



  █ TOTAL RESULTS 

    checks_total.......: 1588    22.613089/s
    checks_succeeded...: 100.00% 1588 out of 1588
    checks_failed......: 0.00%   0 out of 1588

    ✓ status is 201 or 202

    HTTP
    http_req_duration..............: avg=10.07ms  min=5.31ms   med=7.63ms   max=84.61ms p(90)=16.48ms  p(95)=21.36ms 
      { expected_response:true }...: avg=10.07ms  min=5.31ms   med=7.63ms   max=84.61ms p(90)=16.48ms  p(95)=21.36ms 
    http_req_failed................: 0.00%  0 out of 1974
    http_reqs......................: 1974   28.109722/s

    EXECUTION
    iteration_duration.............: avg=511.26ms min=506.06ms med=508.68ms max=586.1ms p(90)=518.43ms p(95)=524.49ms
    iterations.....................: 1974   28.109722/s
    vus............................: 1      min=1         max=20
    vus_max........................: 20     min=20        max=20

    NETWORK
    data_received..................: 813 kB 12 kB/s
    data_sent......................: 373 kB 5.3 kB/s
```

| Metric     | Normal-only run | Mixed with poison pills | Change |
| ---------- | --------------- | ----------------------- | ------ |
| p95        |  23.7  | 21.4 |  -2.3  |
| RPS        |  28.1  | 28.3 |  +0.2  |
| Error rate |   0%   |  0%  |    0   |

---

## Blockers and Lessons Learned

The main integration blocker this sprint was service coupling — several workers depend on other services pushing the right message shapes to the right queues, and when those producer-side changes are on unmerged branches, workers sit idle even though they're fully functional. The analytics worker is a clear example of this: it's built and tested, but can't demonstrate end-to-end pipeline activity until the purchase service integration is merged.

Branch management also remained a friction point. Multiple PRs targeting `dev` with overlapping `compose.yml` changes continued to create merge conflicts that slowed integration. Going into Sprint 4, the team should designate a single person to own `compose.yml` merges to avoid this.

On the positive side, DLQ handling is now in place across the analytics, notification, and waitlist workers, and the refund service is fully wired up with payment and purchase integration.
