import http from 'k6/http'
import { check, sleep } from 'k6'

// Run with: k6 run --env SCALE=single k6/sprint-4-scale.js
// Run with: k6 run --env SCALE=replicated k6/sprint-4-scale.js

const BASE_URL = "http://catalog:3000/events"
export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '60s', target: 50 }, // push harder than Sprint 1 to show scaling benefit
    { duration: '10s', target: 0 },
  ],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)', 'p(50)'],
}

export default function () {
  const res = http.get(`${BASE_URL}`)
  check(res, { 'status is 200': r => r.status === 200 })
  sleep(0.5)
}