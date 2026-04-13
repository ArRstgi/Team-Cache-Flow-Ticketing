# Sprint 1 Report — [Team Name]

**Sprint:** 1 — Foundation  
**Tag:** `sprint-1`  
**Submitted:** [date, before 04.14 class]

---

## What We Built

[One or two paragraphs. What is running? What does `docker compose up` produce? What endpoints are live?]

---

## Individual Contributions

| Team Member | What They Delivered                                     | Key Commits            |
| ----------- | ------------------------------------------------------- | ---------------------- |
| [Name]      | [e.g. order-service with DB schema, health endpoint]    | [short SHA or PR link] |
| [Name]      | [e.g. restaurant-service, synchronous call integration] |                        |
| [Name]      | [e.g. compose.yml wiring, k6 baseline script]           |                        |

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

[Be honest. What did you not finish? What did you cut from the sprint plan and why? How will you address it in Sprint 2?]

---

## k6 Baseline Results

Script: `k6/sprint-1.js`  
Run: `docker compose exec holmes k6 run /workspace/k6/sprint-1.js`

```

  █ THRESHOLDS 

    errors
    ✓ 'rate<0.01' rate=0.00%

    http_req_duration
    ✓ 'p(95)<500' p(95)=1.74ms


  █ TOTAL RESULTS 

    checks_total.......: 4024    57.269664/s
    checks_succeeded...: 100.00% 4024 out of 4024
    checks_failed......: 0.00%   0 out of 4024

    ✓ status is 200
    ✓ response time < 500ms

    CUSTOM
    errors.........................: 0.00%  0 out of 2012

    HTTP
    http_req_duration..............: avg=1.19ms   min=383.57µs med=1.15ms   max=11.23ms  p(95)=1.74ms   p(99)=1.96ms   p(50)=1.15ms  
      { expected_response:true }...: avg=1.19ms   min=383.57µs med=1.15ms   max=11.23ms  p(95)=1.74ms   p(99)=1.96ms   p(50)=1.15ms  
    http_req_failed................: 0.00%  0 out of 2012
    http_reqs......................: 2012   28.634832/s

    EXECUTION
    iteration_duration.............: avg=502.06ms min=500.59ms med=502.05ms max=514.54ms p(95)=502.87ms p(99)=503.27ms p(50)=502.05ms
    iterations.....................: 2012   28.634832/s
    vus............................: 1      min=1         max=20
    vus_max........................: 20     min=20        max=20

    NETWORK
    data_received..................: 535 kB 7.6 kB/s
    data_sent......................: 139 kB 2.0 kB/s




running (1m10.3s), 00/20 VUs, 2012 complete and 0 interrupted iterations
default ✓ [ 100% ] 00/20 VUs  1m10s
```

| Metric             | Value |
| ------------------ | ----- |
| p50 response time  | 1.15ms |
| p95 response time  | 1.74ms |
| p99 response time  | 1.96ms |
| Requests/sec (avg) | 28.63  |
| Error rate         | 0%     |

These numbers are your baseline. Sprint 2 caching should improve them measurably.

---

## Blockers and Lessons Learned

[What slowed you down? What would you do differently? What surprised you?]
