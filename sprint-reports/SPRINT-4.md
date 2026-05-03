# Sprint 4 Report — [Team Name]

**Sprint:** 4 — Replication, Scaling, and Polish  
**Tag:** `sprint-4`  
**Submitted:** [date, before 05.05 class]

---

## What We Built

[Which services are replicated? How does load balancing work? What polish work was completed?]

---

## Individual Contributions

| Team Member | What They Delivered | Key Commits |
| ----------- | ------------------- | ----------- |
| [Name]      | | |
| [Name]      | | |
| [Name]      | | |

---

## Starting the System with Replicas

```bash
docker compose up --scale [service-name]=3 --scale [other-service]=2
```

After startup:

```
[Paste docker compose ps output here showing all replicas as (healthy)]
```

---

## What Is Working

- [ ] At least [N] services replicated via `--scale`
- [ ] Load balancer distributes traffic across replicas (visible in logs)
- [ ] Services are stateless — multiple instances run without conflicts
- [ ] `docker compose ps` shows all replicas as `(healthy)`
- [ ] System is fully complete for team size

---

## What Is Not Working / Cut

---

## k6 Results

### Test 1: Scaling Comparison (`k6/sprint-4-scale.js`)

| Metric | 1 replica | 3 replicas | Change |
| ------ | --------- | ---------- | ------ |
| p50    | 1.87ms  | 1.8ms   | -0.07  |
| p95    | 7.42ms  | 6.72ms  | -0.70  |
| p99    | 15.41ms | 18.17ms | +2.76  |
| RPS    | 52.27/s | 52.22/s | -0.005 |

p95 latency was rather significantly reduced, while p99 latency actually increased. In doing multiple runs of these, I've found the numbers to be pretty inconsistent given the system's complexity and my own machine, but the p95 improvement remains notable.

### Test 2: Replica Failure (`k6/sprint-4-replica.js`)

Timeline:

| Time | Event |
| ---- | ----- |
| 0s   | k6 started, 3 replicas running |
| 40s | Killed replica: `docker stop event-ticketing-catalog-3` |
| 50s | Surviving replicas absorbed traffic |
| 70s | Replica restarted: `docker compose up -d` |
| 80s | Traffic redistributed, back to normal |

```

         /\      Grafana   /‾‾/  
    /\  /  \     |\  __   /  /   
   /  \/    \    | |/ /  /   ‾‾\ 
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/ 


     execution: local
        script: k6/sprint-4-replica.js
        output: -

     scenarios: (100.00%) 1 scenario, 20 max VUs, 3m40s max duration (incl. graceful stop):
              * default: Up to 20 looping VUs for 3m10s over 4 stages (gracefulRampDown: 30s, gracefulStop: 30s)


running (0m01.0s), 01/20 VUs, 1 complete and 0 interrupted iterations
default   [   1% ] 01/20 VUs  0m01.0s/3m10.0s

running (0m02.0s), 02/20 VUs, 3 complete and 0 interrupted iterations
default   [   1% ] 02/20 VUs  0m02.0s/3m10.0s

running (0m03.0s), 02/20 VUs, 7 complete and 0 interrupted iterations
default   [   2% ] 02/20 VUs  0m03.0s/3m10.0s

running (0m04.0s), 03/20 VUs, 12 complete and 0 interrupted iterations
default   [   2% ] 03/20 VUs  0m04.0s/3m10.0s

running (0m05.0s), 04/20 VUs, 18 complete and 0 interrupted iterations
default   [   3% ] 04/20 VUs  0m05.0s/3m10.0s

running (0m06.0s), 04/20 VUs, 26 complete and 0 interrupted iterations
default   [   3% ] 04/20 VUs  0m06.0s/3m10.0s

running (0m07.0s), 05/20 VUs, 35 complete and 0 interrupted iterations
default   [   4% ] 05/20 VUs  0m07.0s/3m10.0s

running (0m08.0s), 06/20 VUs, 45 complete and 0 interrupted iterations
default   [   4% ] 06/20 VUs  0m08.0s/3m10.0s

running (0m09.0s), 06/20 VUs, 57 complete and 0 interrupted iterations
default   [   5% ] 06/20 VUs  0m09.0s/3m10.0s

running (0m10.0s), 07/20 VUs, 70 complete and 0 interrupted iterations
default   [   5% ] 07/20 VUs  0m10.0s/3m10.0s

running (0m11.0s), 07/20 VUs, 84 complete and 0 interrupted iterations
default   [   6% ] 07/20 VUs  0m11.0s/3m10.0s

running (0m12.0s), 08/20 VUs, 99 complete and 0 interrupted iterations
default   [   6% ] 08/20 VUs  0m12.0s/3m10.0s

running (0m13.0s), 09/20 VUs, 115 complete and 0 interrupted iterations
default   [   7% ] 09/20 VUs  0m13.0s/3m10.0s

running (0m14.0s), 09/20 VUs, 133 complete and 0 interrupted iterations
default   [   7% ] 09/20 VUs  0m14.0s/3m10.0s

running (0m15.0s), 10/20 VUs, 152 complete and 0 interrupted iterations
default   [   8% ] 10/20 VUs  0m15.0s/3m10.0s

running (0m16.0s), 11/20 VUs, 171 complete and 0 interrupted iterations
default   [   8% ] 11/20 VUs  0m16.0s/3m10.0s

running (0m17.0s), 11/20 VUs, 193 complete and 0 interrupted iterations
default   [   9% ] 11/20 VUs  0m17.0s/3m10.0s

running (0m18.0s), 12/20 VUs, 216 complete and 0 interrupted iterations
default   [   9% ] 12/20 VUs  0m18.0s/3m10.0s

running (0m19.0s), 13/20 VUs, 240 complete and 0 interrupted iterations
default   [  10% ] 13/20 VUs  0m19.0s/3m10.0s

running (0m20.0s), 13/20 VUs, 266 complete and 0 interrupted iterations
default   [  11% ] 13/20 VUs  0m20.0s/3m10.0s

running (0m21.0s), 14/20 VUs, 292 complete and 0 interrupted iterations
default   [  11% ] 14/20 VUs  0m21.0s/3m10.0s

running (0m22.0s), 14/20 VUs, 320 complete and 0 interrupted iterations
default   [  12% ] 14/20 VUs  0m22.0s/3m10.0s

running (0m23.0s), 15/20 VUs, 349 complete and 0 interrupted iterations
default   [  12% ] 15/20 VUs  0m23.0s/3m10.0s

running (0m24.0s), 16/20 VUs, 379 complete and 0 interrupted iterations
default   [  13% ] 16/20 VUs  0m24.0s/3m10.0s

running (0m25.0s), 16/20 VUs, 411 complete and 0 interrupted iterations
default   [  13% ] 16/20 VUs  0m25.0s/3m10.0s

running (0m26.0s), 17/20 VUs, 444 complete and 0 interrupted iterations
default   [  14% ] 17/20 VUs  0m26.0s/3m10.0s

running (0m27.0s), 18/20 VUs, 478 complete and 0 interrupted iterations
default   [  14% ] 18/20 VUs  0m27.0s/3m10.0s

running (0m28.0s), 18/20 VUs, 514 complete and 0 interrupted iterations
default   [  15% ] 18/20 VUs  0m28.0s/3m10.0s

running (0m29.0s), 19/20 VUs, 551 complete and 0 interrupted iterations
default   [  15% ] 19/20 VUs  0m29.0s/3m10.0s

running (0m30.0s), 19/20 VUs, 589 complete and 0 interrupted iterations
default   [  16% ] 19/20 VUs  0m30.0s/3m10.0s

running (0m31.0s), 20/20 VUs, 627 complete and 0 interrupted iterations
default   [  16% ] 20/20 VUs  0m31.0s/3m10.0s

running (0m32.0s), 20/20 VUs, 667 complete and 0 interrupted iterations
default   [  17% ] 20/20 VUs  0m32.0s/3m10.0s

running (0m33.0s), 20/20 VUs, 707 complete and 0 interrupted iterations
default   [  17% ] 20/20 VUs  0m33.0s/3m10.0s

running (0m34.0s), 20/20 VUs, 747 complete and 0 interrupted iterations
default   [  18% ] 20/20 VUs  0m34.0s/3m10.0s

running (0m35.0s), 20/20 VUs, 786 complete and 0 interrupted iterations
default   [  18% ] 20/20 VUs  0m35.0s/3m10.0s

running (0m36.0s), 20/20 VUs, 826 complete and 0 interrupted iterations
default   [  19% ] 20/20 VUs  0m36.0s/3m10.0s

running (0m37.0s), 20/20 VUs, 866 complete and 0 interrupted iterations
default   [  19% ] 20/20 VUs  0m37.0s/3m10.0s

running (0m38.0s), 20/20 VUs, 906 complete and 0 interrupted iterations
default   [  20% ] 20/20 VUs  0m38.0s/3m10.0s

running (0m39.0s), 20/20 VUs, 946 complete and 0 interrupted iterations
default   [  21% ] 20/20 VUs  0m39.0s/3m10.0s

running (0m40.0s), 20/20 VUs, 986 complete and 0 interrupted iterations
default   [  21% ] 20/20 VUs  0m40.0s/3m10.0s

running (0m41.0s), 20/20 VUs, 1026 complete and 0 interrupted iterations
default   [  22% ] 20/20 VUs  0m41.0s/3m10.0s

running (0m42.0s), 20/20 VUs, 1066 complete and 0 interrupted iterations
default   [  22% ] 20/20 VUs  0m42.0s/3m10.0s

running (0m43.0s), 20/20 VUs, 1106 complete and 0 interrupted iterations
default   [  23% ] 20/20 VUs  0m43.0s/3m10.0s

running (0m44.0s), 20/20 VUs, 1146 complete and 0 interrupted iterations
default   [  23% ] 20/20 VUs  0m44.0s/3m10.0s


                                                           ------ CONTAINER STOPPED HERE ------


running (0m45.0s), 20/20 VUs, 1186 complete and 0 interrupted iterations
default   [  24% ] 20/20 VUs  0m45.0s/3m10.0s

running (0m46.0s), 20/20 VUs, 1226 complete and 0 interrupted iterations
default   [  24% ] 20/20 VUs  0m46.0s/3m10.0s

running (0m47.0s), 20/20 VUs, 1266 complete and 0 interrupted iterations
default   [  25% ] 20/20 VUs  0m47.0s/3m10.0s

running (0m48.0s), 20/20 VUs, 1304 complete and 0 interrupted iterations
default   [  25% ] 20/20 VUs  0m48.0s/3m10.0s

running (0m49.0s), 20/20 VUs, 1342 complete and 0 interrupted iterations
default   [  26% ] 20/20 VUs  0m49.0s/3m10.0s

running (0m50.0s), 20/20 VUs, 1380 complete and 0 interrupted iterations
default   [  26% ] 20/20 VUs  0m50.0s/3m10.0s

running (0m51.0s), 20/20 VUs, 1418 complete and 0 interrupted iterations
default   [  27% ] 20/20 VUs  0m51.0s/3m10.0s

running (0m52.0s), 20/20 VUs, 1456 complete and 0 interrupted iterations
default   [  27% ] 20/20 VUs  0m52.0s/3m10.0s

running (0m53.0s), 20/20 VUs, 1492 complete and 0 interrupted iterations
default   [  28% ] 20/20 VUs  0m53.0s/3m10.0s

running (0m54.0s), 20/20 VUs, 1530 complete and 0 interrupted iterations
default   [  28% ] 20/20 VUs  0m54.0s/3m10.0s

running (0m55.0s), 20/20 VUs, 1568 complete and 0 interrupted iterations
default   [  29% ] 20/20 VUs  0m55.0s/3m10.0s

running (0m56.0s), 20/20 VUs, 1606 complete and 0 interrupted iterations
default   [  29% ] 20/20 VUs  0m56.0s/3m10.0s

running (0m57.0s), 20/20 VUs, 1644 complete and 0 interrupted iterations
default   [  30% ] 20/20 VUs  0m57.0s/3m10.0s

running (0m58.0s), 20/20 VUs, 1682 complete and 0 interrupted iterations
default   [  31% ] 20/20 VUs  0m58.0s/3m10.0s

running (0m59.0s), 20/20 VUs, 1721 complete and 0 interrupted iterations
default   [  31% ] 20/20 VUs  0m59.0s/3m10.0s

running (1m00.0s), 20/20 VUs, 1761 complete and 0 interrupted iterations
default   [  32% ] 20/20 VUs  1m00.0s/3m10.0s

running (1m01.0s), 20/20 VUs, 1801 complete and 0 interrupted iterations
default   [  32% ] 20/20 VUs  1m01.0s/3m10.0s

running (1m02.0s), 20/20 VUs, 1841 complete and 0 interrupted iterations
default   [  33% ] 20/20 VUs  1m02.0s/3m10.0s

running (1m03.0s), 20/20 VUs, 1881 complete and 0 interrupted iterations
default   [  33% ] 20/20 VUs  1m03.0s/3m10.0s

running (1m04.0s), 20/20 VUs, 1921 complete and 0 interrupted iterations
default   [  34% ] 20/20 VUs  1m04.0s/3m10.0s

running (1m05.0s), 20/20 VUs, 1961 complete and 0 interrupted iterations
default   [  34% ] 20/20 VUs  1m05.0s/3m10.0s

running (1m06.0s), 20/20 VUs, 2001 complete and 0 interrupted iterations
default   [  35% ] 20/20 VUs  1m06.0s/3m10.0s

running (1m07.0s), 20/20 VUs, 2040 complete and 0 interrupted iterations
default   [  35% ] 20/20 VUs  1m07.0s/3m10.0s

running (1m08.0s), 20/20 VUs, 2079 complete and 0 interrupted iterations
default   [  36% ] 20/20 VUs  1m08.0s/3m10.0s

running (1m09.0s), 20/20 VUs, 2119 complete and 0 interrupted iterations
default   [  36% ] 20/20 VUs  1m09.0s/3m10.0s


                                                           ------ SYSTEM RESTORED HERE ------


running (1m10.0s), 20/20 VUs, 2159 complete and 0 interrupted iterations
default   [  37% ] 20/20 VUs  1m10.0s/3m10.0s

running (1m11.0s), 20/20 VUs, 2199 complete and 0 interrupted iterations
default   [  37% ] 20/20 VUs  1m11.0s/3m10.0s

running (1m12.0s), 20/20 VUs, 2239 complete and 0 interrupted iterations
default   [  38% ] 20/20 VUs  1m12.0s/3m10.0s

running (1m13.0s), 20/20 VUs, 2279 complete and 0 interrupted iterations
default   [  38% ] 20/20 VUs  1m13.0s/3m10.0s

running (1m14.0s), 20/20 VUs, 2319 complete and 0 interrupted iterations
default   [  39% ] 20/20 VUs  1m14.0s/3m10.0s

running (1m15.0s), 20/20 VUs, 2358 complete and 0 interrupted iterations
default   [  39% ] 20/20 VUs  1m15.0s/3m10.0s

running (1m16.0s), 20/20 VUs, 2398 complete and 0 interrupted iterations
default   [  40% ] 20/20 VUs  1m16.0s/3m10.0s

running (1m17.0s), 20/20 VUs, 2438 complete and 0 interrupted iterations
default   [  41% ] 20/20 VUs  1m17.0s/3m10.0s

running (1m18.0s), 20/20 VUs, 2478 complete and 0 interrupted iterations
default   [  41% ] 20/20 VUs  1m18.0s/3m10.0s

running (1m19.0s), 20/20 VUs, 2518 complete and 0 interrupted iterations
default   [  42% ] 20/20 VUs  1m19.0s/3m10.0s

running (1m20.0s), 20/20 VUs, 2558 complete and 0 interrupted iterations
default   [  42% ] 20/20 VUs  1m20.0s/3m10.0s

running (1m21.0s), 20/20 VUs, 2598 complete and 0 interrupted iterations
default   [  43% ] 20/20 VUs  1m21.0s/3m10.0s

running (1m22.0s), 20/20 VUs, 2638 complete and 0 interrupted iterations
default   [  43% ] 20/20 VUs  1m22.0s/3m10.0s

running (1m23.0s), 20/20 VUs, 2678 complete and 0 interrupted iterations
default   [  44% ] 20/20 VUs  1m23.0s/3m10.0s

running (1m24.0s), 20/20 VUs, 2718 complete and 0 interrupted iterations
default   [  44% ] 20/20 VUs  1m24.0s/3m10.0s

running (1m25.0s), 20/20 VUs, 2758 complete and 0 interrupted iterations
default   [  45% ] 20/20 VUs  1m25.0s/3m10.0s

running (1m26.0s), 20/20 VUs, 2798 complete and 0 interrupted iterations
default   [  45% ] 20/20 VUs  1m26.0s/3m10.0s

running (1m27.0s), 20/20 VUs, 2838 complete and 0 interrupted iterations
default   [  46% ] 20/20 VUs  1m27.0s/3m10.0s

running (1m28.0s), 20/20 VUs, 2878 complete and 0 interrupted iterations
default   [  46% ] 20/20 VUs  1m28.0s/3m10.0s

running (1m29.0s), 20/20 VUs, 2918 complete and 0 interrupted iterations
default   [  47% ] 20/20 VUs  1m29.0s/3m10.0s

running (1m30.0s), 20/20 VUs, 2955 complete and 0 interrupted iterations
default   [  47% ] 20/20 VUs  1m30.0s/3m10.0s

running (1m31.0s), 20/20 VUs, 2995 complete and 0 interrupted iterations
default   [  48% ] 20/20 VUs  1m31.0s/3m10.0s

running (1m32.0s), 20/20 VUs, 3035 complete and 0 interrupted iterations
default   [  48% ] 20/20 VUs  1m32.0s/3m10.0s

running (1m33.0s), 20/20 VUs, 3075 complete and 0 interrupted iterations
default   [  49% ] 20/20 VUs  1m33.0s/3m10.0s

running (1m34.0s), 20/20 VUs, 3115 complete and 0 interrupted iterations
default   [  49% ] 20/20 VUs  1m34.0s/3m10.0s

running (1m35.0s), 20/20 VUs, 3155 complete and 0 interrupted iterations
default   [  50% ] 20/20 VUs  1m35.0s/3m10.0s

running (1m36.0s), 20/20 VUs, 3195 complete and 0 interrupted iterations
default   [  51% ] 20/20 VUs  1m36.0s/3m10.0s

running (1m37.0s), 20/20 VUs, 3235 complete and 0 interrupted iterations
default   [  51% ] 20/20 VUs  1m37.0s/3m10.0s

running (1m38.0s), 20/20 VUs, 3275 complete and 0 interrupted iterations
default   [  52% ] 20/20 VUs  1m38.0s/3m10.0s

running (1m39.0s), 20/20 VUs, 3315 complete and 0 interrupted iterations
default   [  52% ] 20/20 VUs  1m39.0s/3m10.0s

running (1m40.0s), 20/20 VUs, 3354 complete and 0 interrupted iterations
default   [  53% ] 20/20 VUs  1m40.0s/3m10.0s

running (1m41.0s), 20/20 VUs, 3394 complete and 0 interrupted iterations
default   [  53% ] 20/20 VUs  1m41.0s/3m10.0s

running (1m42.0s), 20/20 VUs, 3434 complete and 0 interrupted iterations
default   [  54% ] 20/20 VUs  1m42.0s/3m10.0s

running (1m43.0s), 20/20 VUs, 3474 complete and 0 interrupted iterations
default   [  54% ] 20/20 VUs  1m43.0s/3m10.0s

running (1m44.0s), 20/20 VUs, 3514 complete and 0 interrupted iterations
default   [  55% ] 20/20 VUs  1m44.0s/3m10.0s

running (1m45.0s), 20/20 VUs, 3554 complete and 0 interrupted iterations
default   [  55% ] 20/20 VUs  1m45.0s/3m10.0s

running (1m46.0s), 20/20 VUs, 3594 complete and 0 interrupted iterations
default   [  56% ] 20/20 VUs  1m46.0s/3m10.0s

running (1m47.0s), 20/20 VUs, 3633 complete and 0 interrupted iterations
default   [  56% ] 20/20 VUs  1m47.0s/3m10.0s

running (1m48.0s), 20/20 VUs, 3671 complete and 0 interrupted iterations
default   [  57% ] 20/20 VUs  1m48.0s/3m10.0s

running (1m49.0s), 20/20 VUs, 3711 complete and 0 interrupted iterations
default   [  57% ] 20/20 VUs  1m49.0s/3m10.0s

running (1m50.0s), 20/20 VUs, 3751 complete and 0 interrupted iterations
default   [  58% ] 20/20 VUs  1m50.0s/3m10.0s

running (1m51.0s), 20/20 VUs, 3791 complete and 0 interrupted iterations
default   [  58% ] 20/20 VUs  1m51.0s/3m10.0s

running (1m52.0s), 20/20 VUs, 3831 complete and 0 interrupted iterations
default   [  59% ] 20/20 VUs  1m52.0s/3m10.0s

running (1m53.0s), 20/20 VUs, 3871 complete and 0 interrupted iterations
default   [  59% ] 20/20 VUs  1m53.0s/3m10.0s

running (1m54.0s), 20/20 VUs, 3911 complete and 0 interrupted iterations
default   [  60% ] 20/20 VUs  1m54.0s/3m10.0s

running (1m55.0s), 20/20 VUs, 3951 complete and 0 interrupted iterations
default   [  61% ] 20/20 VUs  1m55.0s/3m10.0s

running (1m56.0s), 20/20 VUs, 3991 complete and 0 interrupted iterations
default   [  61% ] 20/20 VUs  1m56.0s/3m10.0s

running (1m57.0s), 20/20 VUs, 4031 complete and 0 interrupted iterations
default   [  62% ] 20/20 VUs  1m57.0s/3m10.0s

running (1m58.0s), 20/20 VUs, 4071 complete and 0 interrupted iterations
default   [  62% ] 20/20 VUs  1m58.0s/3m10.0s

running (1m59.0s), 20/20 VUs, 4111 complete and 0 interrupted iterations
default   [  63% ] 20/20 VUs  1m59.0s/3m10.0s

running (2m00.0s), 20/20 VUs, 4151 complete and 0 interrupted iterations
default   [  63% ] 20/20 VUs  2m00.0s/3m10.0s

running (2m01.0s), 20/20 VUs, 4191 complete and 0 interrupted iterations
default   [  64% ] 20/20 VUs  2m01.0s/3m10.0s

running (2m02.0s), 20/20 VUs, 4228 complete and 0 interrupted iterations
default   [  64% ] 20/20 VUs  2m02.0s/3m10.0s

running (2m03.0s), 20/20 VUs, 4268 complete and 0 interrupted iterations
default   [  65% ] 20/20 VUs  2m03.0s/3m10.0s

running (2m04.0s), 20/20 VUs, 4308 complete and 0 interrupted iterations
default   [  65% ] 20/20 VUs  2m04.0s/3m10.0s

running (2m05.0s), 20/20 VUs, 4348 complete and 0 interrupted iterations
default   [  66% ] 20/20 VUs  2m05.0s/3m10.0s

running (2m06.0s), 20/20 VUs, 4388 complete and 0 interrupted iterations
default   [  66% ] 20/20 VUs  2m06.0s/3m10.0s

running (2m07.0s), 20/20 VUs, 4428 complete and 0 interrupted iterations
default   [  67% ] 20/20 VUs  2m07.0s/3m10.0s

running (2m08.0s), 20/20 VUs, 4468 complete and 0 interrupted iterations
default   [  67% ] 20/20 VUs  2m08.0s/3m10.0s

running (2m09.0s), 20/20 VUs, 4508 complete and 0 interrupted iterations
default   [  68% ] 20/20 VUs  2m09.0s/3m10.0s

running (2m10.0s), 20/20 VUs, 4548 complete and 0 interrupted iterations
default   [  68% ] 20/20 VUs  2m10.0s/3m10.0s

running (2m11.0s), 20/20 VUs, 4588 complete and 0 interrupted iterations
default   [  69% ] 20/20 VUs  2m11.0s/3m10.0s

running (2m12.0s), 20/20 VUs, 4628 complete and 0 interrupted iterations
default   [  69% ] 20/20 VUs  2m12.0s/3m10.0s

running (2m13.0s), 20/20 VUs, 4668 complete and 0 interrupted iterations
default   [  70% ] 20/20 VUs  2m13.0s/3m10.0s

running (2m14.0s), 20/20 VUs, 4708 complete and 0 interrupted iterations
default   [  71% ] 20/20 VUs  2m14.0s/3m10.0s

running (2m15.0s), 20/20 VUs, 4748 complete and 0 interrupted iterations
default   [  71% ] 20/20 VUs  2m15.0s/3m10.0s

running (2m16.0s), 20/20 VUs, 4788 complete and 0 interrupted iterations
default   [  72% ] 20/20 VUs  2m16.0s/3m10.0s

running (2m17.0s), 20/20 VUs, 4828 complete and 0 interrupted iterations
default   [  72% ] 20/20 VUs  2m17.0s/3m10.0s

running (2m18.0s), 20/20 VUs, 4868 complete and 0 interrupted iterations
default   [  73% ] 20/20 VUs  2m18.0s/3m10.0s

running (2m19.0s), 20/20 VUs, 4906 complete and 0 interrupted iterations
default   [  73% ] 20/20 VUs  2m19.0s/3m10.0s

running (2m20.0s), 20/20 VUs, 4946 complete and 0 interrupted iterations
default   [  74% ] 20/20 VUs  2m20.0s/3m10.0s

running (2m21.0s), 20/20 VUs, 4986 complete and 0 interrupted iterations
default   [  74% ] 20/20 VUs  2m21.0s/3m10.0s

running (2m22.0s), 20/20 VUs, 5026 complete and 0 interrupted iterations
default   [  75% ] 20/20 VUs  2m22.0s/3m10.0s

running (2m23.0s), 20/20 VUs, 5066 complete and 0 interrupted iterations
default   [  75% ] 20/20 VUs  2m23.0s/3m10.0s

running (2m24.0s), 20/20 VUs, 5106 complete and 0 interrupted iterations
default   [  76% ] 20/20 VUs  2m24.0s/3m10.0s

running (2m25.0s), 20/20 VUs, 5146 complete and 0 interrupted iterations
default   [  76% ] 20/20 VUs  2m25.0s/3m10.0s

running (2m26.0s), 20/20 VUs, 5186 complete and 0 interrupted iterations
default   [  77% ] 20/20 VUs  2m26.0s/3m10.0s

running (2m27.0s), 20/20 VUs, 5226 complete and 0 interrupted iterations
default   [  77% ] 20/20 VUs  2m27.0s/3m10.0s

running (2m28.0s), 20/20 VUs, 5266 complete and 0 interrupted iterations
default   [  78% ] 20/20 VUs  2m28.0s/3m10.0s

running (2m29.0s), 20/20 VUs, 5306 complete and 0 interrupted iterations
default   [  78% ] 20/20 VUs  2m29.0s/3m10.0s

running (2m30.0s), 20/20 VUs, 5346 complete and 0 interrupted iterations
default   [  79% ] 20/20 VUs  2m30.0s/3m10.0s

running (2m31.0s), 20/20 VUs, 5386 complete and 0 interrupted iterations
default   [  79% ] 20/20 VUs  2m31.0s/3m10.0s

running (2m32.0s), 20/20 VUs, 5426 complete and 0 interrupted iterations
default   [  80% ] 20/20 VUs  2m32.0s/3m10.0s

running (2m33.0s), 20/20 VUs, 5466 complete and 0 interrupted iterations
default   [  81% ] 20/20 VUs  2m33.0s/3m10.0s

running (2m34.0s), 20/20 VUs, 5506 complete and 0 interrupted iterations
default   [  81% ] 20/20 VUs  2m34.0s/3m10.0s

running (2m35.0s), 20/20 VUs, 5546 complete and 0 interrupted iterations
default   [  82% ] 20/20 VUs  2m35.0s/3m10.0s

running (2m36.0s), 20/20 VUs, 5586 complete and 0 interrupted iterations
default   [  82% ] 20/20 VUs  2m36.0s/3m10.0s

running (2m37.0s), 20/20 VUs, 5625 complete and 0 interrupted iterations
default   [  83% ] 20/20 VUs  2m37.0s/3m10.0s

running (2m38.0s), 20/20 VUs, 5665 complete and 0 interrupted iterations
default   [  83% ] 20/20 VUs  2m38.0s/3m10.0s

running (2m39.0s), 20/20 VUs, 5705 complete and 0 interrupted iterations
default   [  84% ] 20/20 VUs  2m39.0s/3m10.0s

running (2m40.0s), 20/20 VUs, 5744 complete and 0 interrupted iterations
default   [  84% ] 20/20 VUs  2m40.0s/3m10.0s

running (2m41.0s), 20/20 VUs, 5784 complete and 0 interrupted iterations
default   [  85% ] 20/20 VUs  2m41.0s/3m10.0s

running (2m42.0s), 20/20 VUs, 5824 complete and 0 interrupted iterations
default   [  85% ] 20/20 VUs  2m42.0s/3m10.0s

running (2m43.0s), 20/20 VUs, 5864 complete and 0 interrupted iterations
default   [  86% ] 20/20 VUs  2m43.0s/3m10.0s

running (2m44.0s), 20/20 VUs, 5904 complete and 0 interrupted iterations
default   [  86% ] 20/20 VUs  2m44.0s/3m10.0s

running (2m45.0s), 20/20 VUs, 5944 complete and 0 interrupted iterations
default   [  87% ] 20/20 VUs  2m45.0s/3m10.0s

running (2m46.0s), 20/20 VUs, 5984 complete and 0 interrupted iterations
default   [  87% ] 20/20 VUs  2m46.0s/3m10.0s

running (2m47.0s), 20/20 VUs, 6024 complete and 0 interrupted iterations
default   [  88% ] 20/20 VUs  2m47.0s/3m10.0s

running (2m48.0s), 20/20 VUs, 6064 complete and 0 interrupted iterations
default   [  88% ] 20/20 VUs  2m48.0s/3m10.0s

running (2m49.0s), 20/20 VUs, 6104 complete and 0 interrupted iterations
default   [  89% ] 20/20 VUs  2m49.0s/3m10.0s

running (2m50.0s), 20/20 VUs, 6144 complete and 0 interrupted iterations
default   [  89% ] 20/20 VUs  2m50.0s/3m10.0s

running (2m51.0s), 20/20 VUs, 6184 complete and 0 interrupted iterations
default   [  90% ] 20/20 VUs  2m51.0s/3m10.0s

running (2m52.0s), 20/20 VUs, 6224 complete and 0 interrupted iterations
default   [  91% ] 20/20 VUs  2m52.0s/3m10.0s

running (2m53.0s), 20/20 VUs, 6264 complete and 0 interrupted iterations
default   [  91% ] 20/20 VUs  2m53.0s/3m10.0s

running (2m54.0s), 20/20 VUs, 6304 complete and 0 interrupted iterations
default   [  92% ] 20/20 VUs  2m54.0s/3m10.0s

running (2m55.0s), 20/20 VUs, 6344 complete and 0 interrupted iterations
default   [  92% ] 20/20 VUs  2m55.0s/3m10.0s

running (2m56.0s), 20/20 VUs, 6384 complete and 0 interrupted iterations
default   [  93% ] 20/20 VUs  2m56.0s/3m10.0s

running (2m57.0s), 20/20 VUs, 6424 complete and 0 interrupted iterations
default   [  93% ] 20/20 VUs  2m57.0s/3m10.0s

running (2m58.0s), 20/20 VUs, 6461 complete and 0 interrupted iterations
default   [  94% ] 20/20 VUs  2m58.0s/3m10.0s

running (2m59.0s), 20/20 VUs, 6501 complete and 0 interrupted iterations
default   [  94% ] 20/20 VUs  2m59.0s/3m10.0s

running (3m00.0s), 20/20 VUs, 6541 complete and 0 interrupted iterations
default   [  95% ] 20/20 VUs  3m00.0s/3m10.0s

running (3m01.0s), 19/20 VUs, 6581 complete and 0 interrupted iterations
default   [  95% ] 19/20 VUs  3m01.0s/3m10.0s

running (3m02.0s), 17/20 VUs, 6618 complete and 0 interrupted iterations
default   [  96% ] 17/20 VUs  3m02.0s/3m10.0s

running (3m03.0s), 15/20 VUs, 6651 complete and 0 interrupted iterations
default   [  96% ] 15/20 VUs  3m03.0s/3m10.0s

running (3m04.0s), 13/20 VUs, 6680 complete and 0 interrupted iterations
default   [  97% ] 13/20 VUs  3m04.0s/3m10.0s

running (3m05.0s), 11/20 VUs, 6705 complete and 0 interrupted iterations
default   [  97% ] 11/20 VUs  3m05.0s/3m10.0s

running (3m06.0s), 09/20 VUs, 6726 complete and 0 interrupted iterations
default   [  98% ] 09/20 VUs  3m06.0s/3m10.0s

running (3m07.0s), 07/20 VUs, 6743 complete and 0 interrupted iterations
default   [  98% ] 07/20 VUs  3m07.0s/3m10.0s

running (3m08.0s), 05/20 VUs, 6756 complete and 0 interrupted iterations
default   [  99% ] 05/20 VUs  3m08.0s/3m10.0s

running (3m09.0s), 03/20 VUs, 6765 complete and 0 interrupted iterations
default   [  99% ] 03/20 VUs  3m09.0s/3m10.0s

running (3m10.0s), 01/20 VUs, 6770 complete and 0 interrupted iterations
default   [ 100% ] 01/20 VUs  3m10.0s/3m10.0s


  █ TOTAL RESULTS 

    checks_total.......: 6771    35.585046/s
    checks_succeeded...: 100.00% 6771 out of 6771
    checks_failed......: 0.00%   0 out of 6771

    ✓ status is 200

    HTTP
    http_req_duration..............: avg=1.14ms  min=530.35µs med=1.03ms   max=23.2ms p(90)=1.38ms   p(95)=1.52ms  
      { expected_response:true }...: avg=1.14ms  min=530.35µs med=1.03ms   max=23.2ms p(90)=1.38ms   p(95)=1.52ms  
    http_req_failed................: 0.00%  0 out of 6771
    http_reqs......................: 6771   35.585046/s

    EXECUTION
    iteration_duration.............: avg=503.6ms min=500.73ms med=501.86ms max=11.77s p(90)=502.35ms p(95)=502.57ms
    iterations.....................: 6771   35.585046/s
    vus............................: 1      min=1         max=20
    vus_max........................: 20     min=20        max=20

    NETWORK
    data_received..................: 3.5 MB 19 kB/s
    data_sent......................: 501 kB 2.6 kB/s




running (3m10.3s), 00/20 VUs, 6771 complete and 0 interrupted iterations
default ✓ [ 100% ] 00/20 VUs  3m10s

```

During and After Failure — `docker compose ps`:

```
PS C:\Users\wailm\OneDrive\Documents\GitHub\Team-Cache-Flow-Ticketing> docker stop event-ticketing-catalog-3
event-ticketing-catalog-3
PS C:\Users\wailm\OneDrive\Documents\GitHub\Team-Cache-Flow-Ticketing> docker compose ps | grep catalog     
event-ticketing-catalog-1           event-ticketing-catalog           "docker-entrypoint.s…"   catalog           2 hours ago   Up 25 minutes (healthy)   
event-ticketing-catalog-2           event-ticketing-catalog           "docker-entrypoint.s…"   catalog           2 hours ago   Up 2 hours (healthy)      
PS C:\Users\wailm\OneDrive\Documents\GitHub\Team-Cache-Flow-Ticketing> docker compose up --scale catalog=3 -d
[+] up 18/18
 ✔ Container refund-db                         Healthy                                                                                                             1.1s
 ✔ Container postgres                          Healthy                                                                                                             0.6s
 ✔ Container purchase-db                       Healthy                                                                                                             1.1s
 ✔ Container analytics-db                      Healthy                                                                                                             0.6s
 ✔ Container holmes                            Running                                                                                                             0.0s
 ✔ Container redis                             Healthy                                                                                                             0.6s
 ✔ Container frontend                          Running                                                                                                             0.0s
 ✔ Container event-ticketing-fraud-detection-1 Running                                                                                                             0.0s
 ✔ Container event-ticketing-waitlist-1        Running                                                                                                             0.0s
 ✔ Container payment                           Healthy                                                                                                             1.1s
 ✔ Container notification                      Running                                                                                                             0.0s
 ✔ Container analytics                         Running                                                                                                             0.0s
 ✔ Container purchase                          Running                                                                                                             0.0s
 ✔ Container event-ticketing-catalog-1         Healthy                                                                                                             1.1s
 ✔ Container refund                            Running                                                                                                             0.0s
 ✔ Container event-ticketing-catalog-2         Healthy                                                                                                             1.1s
 ✔ Container event-ticketing-catalog-3         Healthy                                                                                                             1.1s
 ✔ Container caddy                             Running                                                                                                             0.0s
PS C:\Users\wailm\OneDrive\Documents\GitHub\Team-Cache-Flow-Ticketing> docker compose ps | grep catalog     
event-ticketing-catalog-1           event-ticketing-catalog           "docker-entrypoint.s…"   catalog           2 hours ago   Up 26 minutes (healthy)   
event-ticketing-catalog-2           event-ticketing-catalog           "docker-entrypoint.s…"   catalog           2 hours ago   Up 2 hours (healthy)      
event-ticketing-catalog-3           event-ticketing-catalog           "docker-entrypoint.s…"   catalog           2 hours ago   Up 31 seconds (healthy) 
```

---

## Blockers and Lessons Learned
