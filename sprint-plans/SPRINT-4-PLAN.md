# Sprint 4 Plan — Team Cache Flow Ticketing

**Sprint:** 4 — Replication, Scaling, and Polish  
**Dates:** 04.28 → 05.07  
**Written:** 04.28 in class

---

## Goal

Replicate Purchase, Payment, and Event Catalog services. 

Polish all remaining functionality. 

Ensure replicas are failure resistant. 

Do k6 tests for the scaled replicas. 

---

## Ownership

| Team Member | Files / Directories Owned This Sprint |
| ----------- | ------------------------------------- |
| Enver Amboy      | `purchase` connections|
| Arush Rastogi    | `payment` replication|
| Hayun Jung       | `notifications` connection to purchase|
| Mihir Nagarkatti | README, sprint plan |
| Casey Hammill    | `k6` part|
| Michael Ye       | `event-catalog` replication, caddy initialization|
| Mahad Mushtaq    | `purchase` replication, Sprint report|
| Edison Zheng     |  Caddy development |
| Daniel Brown     | `frontend` polishing, k6 part |

---

## Tasks

### Replication

### Polishing

### Failure Resistance. 

### K6 tests

---

## Risks

We need to make sure that the replicated services don't hold internal state, instead of 

---

## Definition of Done

`docker compose up --scale [service]=3` starts successfully. `docker compose ps` shows all replicas as `(healthy)`. k6 scaling comparison shows measurable improvement. Replica failure test shows no dropped requests.
