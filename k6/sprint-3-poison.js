import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = 'http://purchase:9001/purchase'

// 80% valid requests, 20% poison pills
export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '10s', target: 0 },
  ],
}

let index = 1

export default function () {
  const isPoisonPill = Math.random() < 0.2
  let id = 'test-' + __VU.toString() + '-' + index.toString()
  index++
  if (isPoisonPill) {
    // Send a deliberately malformed request
    const res = http.post(BASE_URL, {
        user_id: id,
        seat_number: '5',
      });
    // We expect this to be accepted (HTTP 202) and routed to the DLQ by the worker
  } else {
    // Send a normal, valid request
    const res = http.post(BASE_URL, {
        user_id: id,
        seat_number: '5',
        event_id: '777'
      });
    check(res, {
      'status is 201 or 202': r => r.status === 201 || r.status === 202,
    })
  }

  sleep(0.5)
}