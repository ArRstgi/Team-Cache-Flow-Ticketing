# Sprint 1 Plan — [Team Name]

**Sprint:** 1 — Foundation  
**Dates:** 04.07 → 04.14  
**Written:** 04.07 in class

---

## Goal

We will have the core services running, with health endpoints. We will also have a synchronous service-to-service HTTP call implemented (purchase to payment). Redis and Postgres will also be running and connectable. All the services that will be implemented will be in the compose yml file. Finally, the README will include some information about the whole system, including the endpoints. 

---

## Ownership

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
| Mahad Mushtaq    | Sprint Report       |

Each person must have meaningful commits in the paths they claim. Ownership is verified by:

```bash
git log --author="Name" --oneline -- path/to/directory/
```

---

## Tasks

* Folder structure and skeleton, with compose skeleton as well. 
* All of the services considered above in the Ownership section, with a health endpoint implemented.
* Reports and other MD files completed by the people above 
* Synchronous call between services (purchase to payment)

---

## Risks

Splitting up work on a team of 9 is difficult and we're not sure if we split up the work in an optimal way. 

Making sure everyone knows what work they are meant to do.

---

## Definition of Done

A TA can clone this repo, check out `sprint-1`, run `docker compose up`, and:

- `docker compose ps` shows every service as `(healthy)`
- `GET /health` on each service returns `200` with DB and Redis status
- The synchronous service-to-service call works end-to-end
- k6 baseline results are included in `SPRINT-1.md`
