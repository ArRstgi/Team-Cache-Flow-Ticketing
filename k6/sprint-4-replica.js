import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = "http://catalog:3000/events"

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp up
    { duration: '120s', target: 20 }, // sustained — manually stop a replica during this window
    { duration: '30s', target: 20 }, // verify recovery
    { duration: '10s', target: 0 },
  ],
}

export default function () {
  const res = http.get(`${BASE_URL}`)
  check(res, { 'status is 200': r => r.status === 200 })
  sleep(0.5)
}