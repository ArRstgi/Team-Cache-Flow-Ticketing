# Sprint 3 Plan — [Team Name]

**Sprint:** 3 — Reliability and Poison Pills  
**Dates:** 04.21 → 04.28  
**Written:** 04.21 in class

---

## Goal

Adding dead letter queues, poison pill handling and finishing redis pub/sub

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

### Redis Pub/Sub

### Dead Letter Queues

### k6 Testing

---

## Risks

### Not handling errors properly

### Not connecting services properly

---

## Definition of Done

After injecting poison pills, the worker's `/health` shows non-zero `dlq_depth` while status remains `healthy`. Good messages keep flowing. k6 results show throughput does not collapse.
