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
| p50    | 1.15 ms | 1.46 ms | +0.31 |
| p95    | 1.74 ms | 2.10 ms | +0.36 |
| p99    | 1.96 ms | 2.49 ms | +0.53 |
| RPS    | 28.63   | 28.58   | -0.05 |

While caching was implemented, our system is much more complex than it was when we first ran our baseline in Sprint 1, making it not a very accurate baseline at all. The event catalog service was partially incomplete at the time of Sprint 1

### Test 2: Async Pipeline Burst (`k6/sprint-2-async.js`)

```

         /\      Grafana   /‾‾/  
    /\  /  \     |\  __   /  /   
   /  \/    \    | |/ /  /   ‾‾\ 
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/ 


     execution: local
        script: k6/sprint-2-async.js
        output: -

     scenarios: (100.00%) 1 scenario, 20 max VUs, 1m40s max duration (incl. graceful stop):
              * default: Up to 20 looping VUs for 1m10s over 3 stages (gracefulRampDown: 30s, gracefulStop: 30s)


running (0m01.0s), 01/20 VUs, 1 complete and 0 interrupted iterations
default   [   1% ] 01/20 VUs  0m01.0s/1m10.0s

running (0m02.0s), 02/20 VUs, 3 complete and 0 interrupted iterations
default   [   3% ] 02/20 VUs  0m02.0s/1m10.0s

running (0m03.0s), 02/20 VUs, 7 complete and 0 interrupted iterations
default   [   4% ] 02/20 VUs  0m03.0s/1m10.0s

running (0m04.0s), 03/20 VUs, 12 complete and 0 interrupted iterations
default   [   6% ] 03/20 VUs  0m04.0s/1m10.0s

running (0m05.0s), 04/20 VUs, 18 complete and 0 interrupted iterations
default   [   7% ] 04/20 VUs  0m05.0s/1m10.0s

running (0m06.0s), 04/20 VUs, 26 complete and 0 interrupted iterations
default   [   9% ] 04/20 VUs  0m06.0s/1m10.0s

running (0m07.0s), 05/20 VUs, 35 complete and 0 interrupted iterations
default   [  10% ] 05/20 VUs  0m07.0s/1m10.0s

running (0m08.0s), 06/20 VUs, 45 complete and 0 interrupted iterations
default   [  11% ] 06/20 VUs  0m08.0s/1m10.0s

running (0m09.0s), 06/20 VUs, 57 complete and 0 interrupted iterations
default   [  13% ] 06/20 VUs  0m09.0s/1m10.0s

running (0m10.0s), 07/20 VUs, 70 complete and 0 interrupted iterations
default   [  14% ] 07/20 VUs  0m10.0s/1m10.0s

running (0m11.0s), 07/20 VUs, 83 complete and 0 interrupted iterations
default   [  16% ] 07/20 VUs  0m11.0s/1m10.0s

running (0m12.0s), 08/20 VUs, 95 complete and 0 interrupted iterations
default   [  17% ] 08/20 VUs  0m12.0s/1m10.0s

running (0m13.0s), 09/20 VUs, 108 complete and 0 interrupted iterations
default   [  19% ] 09/20 VUs  0m13.0s/1m10.0s

running (0m14.0s), 09/20 VUs, 126 complete and 0 interrupted iterations
default   [  20% ] 09/20 VUs  0m14.0s/1m10.0s

running (0m15.0s), 10/20 VUs, 145 complete and 0 interrupted iterations
default   [  21% ] 10/20 VUs  0m15.0s/1m10.0s

running (0m16.0s), 11/20 VUs, 165 complete and 0 interrupted iterations
default   [  23% ] 11/20 VUs  0m16.0s/1m10.0s

running (0m17.0s), 11/20 VUs, 187 complete and 0 interrupted iterations
default   [  24% ] 11/20 VUs  0m17.0s/1m10.0s

running (0m18.0s), 12/20 VUs, 210 complete and 0 interrupted iterations
default   [  26% ] 12/20 VUs  0m18.0s/1m10.0s

running (0m19.0s), 13/20 VUs, 234 complete and 0 interrupted iterations
default   [  27% ] 13/20 VUs  0m19.0s/1m10.0s

running (0m20.0s), 13/20 VUs, 260 complete and 0 interrupted iterations
default   [  29% ] 13/20 VUs  0m20.0s/1m10.0s

running (0m21.0s), 14/20 VUs, 284 complete and 0 interrupted iterations
default   [  30% ] 14/20 VUs  0m21.0s/1m10.0s

running (0m22.0s), 14/20 VUs, 311 complete and 0 interrupted iterations
default   [  31% ] 14/20 VUs  0m22.0s/1m10.0s

running (0m23.0s), 15/20 VUs, 336 complete and 0 interrupted iterations
default   [  33% ] 15/20 VUs  0m23.0s/1m10.0s

running (0m24.0s), 16/20 VUs, 365 complete and 0 interrupted iterations
default   [  34% ] 16/20 VUs  0m24.0s/1m10.0s

running (0m25.0s), 16/20 VUs, 393 complete and 0 interrupted iterations
default   [  36% ] 16/20 VUs  0m25.0s/1m10.0s

running (0m26.0s), 17/20 VUs, 425 complete and 0 interrupted iterations
default   [  37% ] 17/20 VUs  0m26.0s/1m10.0s

running (0m27.0s), 18/20 VUs, 459 complete and 0 interrupted iterations
default   [  39% ] 18/20 VUs  0m27.0s/1m10.0s

running (0m28.0s), 18/20 VUs, 495 complete and 0 interrupted iterations
default   [  40% ] 18/20 VUs  0m28.0s/1m10.0s

running (0m29.0s), 19/20 VUs, 532 complete and 0 interrupted iterations
default   [  41% ] 19/20 VUs  0m29.0s/1m10.0s

running (0m30.0s), 19/20 VUs, 570 complete and 0 interrupted iterations
default   [  43% ] 19/20 VUs  0m30.0s/1m10.0s

running (0m31.0s), 20/20 VUs, 599 complete and 0 interrupted iterations
default   [  44% ] 20/20 VUs  0m31.0s/1m10.0s

running (0m32.0s), 20/20 VUs, 638 complete and 0 interrupted iterations
default   [  46% ] 20/20 VUs  0m32.0s/1m10.0s

running (0m33.0s), 20/20 VUs, 678 complete and 0 interrupted iterations
default   [  47% ] 20/20 VUs  0m33.0s/1m10.0s

running (0m34.0s), 20/20 VUs, 718 complete and 0 interrupted iterations
default   [  49% ] 20/20 VUs  0m34.0s/1m10.0s

running (0m35.0s), 20/20 VUs, 756 complete and 0 interrupted iterations
default   [  50% ] 20/20 VUs  0m35.0s/1m10.0s

running (0m36.0s), 20/20 VUs, 791 complete and 0 interrupted iterations
default   [  51% ] 20/20 VUs  0m36.0s/1m10.0s

running (0m37.0s), 20/20 VUs, 826 complete and 0 interrupted iterations
default   [  53% ] 20/20 VUs  0m37.0s/1m10.0s

running (0m38.0s), 20/20 VUs, 863 complete and 0 interrupted iterations
default   [  54% ] 20/20 VUs  0m38.0s/1m10.0s

running (0m39.0s), 20/20 VUs, 902 complete and 0 interrupted iterations
default   [  56% ] 20/20 VUs  0m39.0s/1m10.0s

running (0m40.0s), 20/20 VUs, 941 complete and 0 interrupted iterations
default   [  57% ] 20/20 VUs  0m40.0s/1m10.0s

running (0m41.0s), 20/20 VUs, 981 complete and 0 interrupted iterations
default   [  59% ] 20/20 VUs  0m41.0s/1m10.0s

running (0m42.0s), 20/20 VUs, 1021 complete and 0 interrupted iterations
default   [  60% ] 20/20 VUs  0m42.0s/1m10.0s

running (0m43.0s), 20/20 VUs, 1052 complete and 0 interrupted iterations
default   [  61% ] 20/20 VUs  0m43.0s/1m10.0s

running (0m44.0s), 20/20 VUs, 1092 complete and 0 interrupted iterations
default   [  63% ] 20/20 VUs  0m44.0s/1m10.0s

running (0m45.0s), 20/20 VUs, 1131 complete and 0 interrupted iterations
default   [  64% ] 20/20 VUs  0m45.0s/1m10.0s

running (0m46.0s), 20/20 VUs, 1169 complete and 0 interrupted iterations
default   [  66% ] 20/20 VUs  0m46.0s/1m10.0s

running (0m47.0s), 20/20 VUs, 1209 complete and 0 interrupted iterations
default   [  67% ] 20/20 VUs  0m47.0s/1m10.0s

running (0m48.0s), 20/20 VUs, 1248 complete and 0 interrupted iterations
default   [  69% ] 20/20 VUs  0m48.0s/1m10.0s

running (0m49.0s), 20/20 VUs, 1288 complete and 0 interrupted iterations
default   [  70% ] 20/20 VUs  0m49.0s/1m10.0s

running (0m50.0s), 20/20 VUs, 1327 complete and 0 interrupted iterations
default   [  71% ] 20/20 VUs  0m50.0s/1m10.0s

running (0m51.0s), 20/20 VUs, 1366 complete and 0 interrupted iterations
default   [  73% ] 20/20 VUs  0m51.0s/1m10.0s

running (0m52.0s), 20/20 VUs, 1394 complete and 0 interrupted iterations
default   [  74% ] 20/20 VUs  0m52.0s/1m10.0s

running (0m53.0s), 20/20 VUs, 1434 complete and 0 interrupted iterations
default   [  76% ] 20/20 VUs  0m53.0s/1m10.0s

running (0m54.0s), 20/20 VUs, 1474 complete and 0 interrupted iterations
default   [  77% ] 20/20 VUs  0m54.0s/1m10.0s

running (0m55.0s), 20/20 VUs, 1514 complete and 0 interrupted iterations
default   [  79% ] 20/20 VUs  0m55.0s/1m10.0s

running (0m56.0s), 20/20 VUs, 1554 complete and 0 interrupted iterations
default   [  80% ] 20/20 VUs  0m56.0s/1m10.0s

running (0m57.0s), 20/20 VUs, 1585 complete and 0 interrupted iterations
default   [  81% ] 20/20 VUs  0m57.0s/1m10.0s

running (0m58.0s), 20/20 VUs, 1624 complete and 0 interrupted iterations
default   [  83% ] 20/20 VUs  0m58.0s/1m10.0s

running (0m59.0s), 20/20 VUs, 1664 complete and 0 interrupted iterations
default   [  84% ] 20/20 VUs  0m59.0s/1m10.0s

running (1m00.0s), 20/20 VUs, 1702 complete and 0 interrupted iterations
default   [  86% ] 20/20 VUs  1m00.0s/1m10.0s

running (1m01.0s), 19/20 VUs, 1741 complete and 0 interrupted iterations
default   [  87% ] 19/20 VUs  1m01.0s/1m10.0s

running (1m02.0s), 17/20 VUs, 1777 complete and 0 interrupted iterations
default   [  89% ] 17/20 VUs  1m02.0s/1m10.0s

running (1m03.0s), 15/20 VUs, 1809 complete and 0 interrupted iterations
default   [  90% ] 15/20 VUs  1m03.0s/1m10.0s

running (1m04.0s), 13/20 VUs, 1838 complete and 0 interrupted iterations
default   [  91% ] 13/20 VUs  1m04.0s/1m10.0s

running (1m05.0s), 11/20 VUs, 1859 complete and 0 interrupted iterations
default   [  93% ] 11/20 VUs  1m05.0s/1m10.0s

running (1m06.0s), 09/20 VUs, 1879 complete and 0 interrupted iterations
default   [  94% ] 09/20 VUs  1m06.0s/1m10.0s

running (1m07.0s), 07/20 VUs, 1896 complete and 0 interrupted iterations
default   [  96% ] 07/20 VUs  1m07.0s/1m10.0s

running (1m08.0s), 05/20 VUs, 1909 complete and 0 interrupted iterations
default   [  97% ] 05/20 VUs  1m08.0s/1m10.0s

running (1m09.0s), 03/20 VUs, 1918 complete and 0 interrupted iterations
default   [  99% ] 03/20 VUs  1m09.0s/1m10.0s

running (1m10.0s), 01/20 VUs, 1923 complete and 0 interrupted iterations
default   [ 100% ] 01/20 VUs  1m10.0s/1m10.0s


  █ THRESHOLDS 

    errors
    ✓ 'rate<0.01' rate=0.15%

    http_req_duration
    ✓ 'p(95)<500' p(95)=62.49ms


  █ TOTAL RESULTS 

    checks_total.......: 3848   54.599165/s
    checks_succeeded...: 99.92% 3845 out of 3848
    checks_failed......: 0.07%  3 out of 3848

    ✗ status is 200
      ↳  99% — ✓ 1921 / ✗ 3
    ✓ response time < 500ms

    CUSTOM
    errors.........................: 0.15%  3 out of 1924

    HTTP
    http_req_duration..............: avg=23.96ms  min=0s       med=18.69ms  max=105.66ms p(95)=62.49ms  p(99)=86.88ms  p(50)=18.69ms 
      { expected_response:true }...: avg=23.98ms  min=2.04ms   med=18.7ms   max=105.66ms p(95)=62.5ms   p(99)=86.9ms   p(50)=18.7ms  
    http_req_failed................: 0.10%  2 out of 1924
    http_reqs......................: 1924   27.299582/s

    EXECUTION
    iteration_duration.............: avg=525.03ms min=501.47ms med=519.64ms max=606.02ms p(95)=563.26ms p(99)=588.06ms p(50)=519.64ms
    iterations.....................: 1924   27.299582/s
    vus............................: 1      min=1         max=20
    vus_max........................: 20     min=20        max=20

    NETWORK
    data_received..................: 769 kB 11 kB/s
    data_sent......................: 359 kB 5.1 kB/s




running (1m10.5s), 00/20 VUs, 1924 complete and 0 interrupted iterations
default ✓ [ 100% ] 00/20 VUs  1m10s

```

Worker health during the burst (hit `/health` while k6 is running):

```
{
    "status":"healthy",
    "service":"purchase",
    "timestamp":"2026-04-20T21:07:29.714Z",
    "uptime_seconds":401,
    "checks":
        {
            "database":
                {
                    "status":"healthy",
                    "latency_ms":2
                },
            "redis":
                {
                    "status":"healthy",
                    "latency_ms":1
                }
        }
}
```

Idempotency check: k6 test sent the same exact payload repeatedly, causing the idempotency check to go off. The payload is not added into the queue, but the request does not throw an error, avoiding duplicate work

---

## Blockers and Lessons Learned

The biggest carryover blocker from Sprint 1 was the k6 script never getting updated with real service URLs, which meant we couldn't get baseline numbers and the before/after comparison for caching is incomplete. Going into Sprint 3 that needs to be the first thing locked down.

On the workflow side, branches diverged a lot again this sprint — several PRs had merge conflicts on compose.yml which slowed down integration. We're getting better at it but still need to merge into dev more frequently rather than letting branches sit for days.

The async pipeline itself came together well. The analytics worker, waitlist worker, and refund pub/sub flow are all working end-to-end locally.
