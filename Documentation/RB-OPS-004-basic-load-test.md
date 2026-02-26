# RB-OPS-004: Basic Load Test Runbook

| Field     | Value                                      |
| --------- | ------------------------------------------ |
| Runbook   | RB-OPS-004                                 |
| Category  | Operations — Load Testing                  |
| Severity  | Gate blocker (Phase 8)                     |
| Owner     | Engineering                                |
| Status    | Draft                                      |

---

## Purpose

Verify that RunwayCtrl's control plane does not collapse under basic load / abuse patterns before shipping to design partners.

## When to run

- Before Phase 8 Gate sign-off.
- After significant performance-related changes (connection pooling, query optimization, caching).
- Nightly CI (optional, recommended post-v0.1).

## Prerequisites

- Running control-plane instance(s) connected to Postgres.
- Test tenant with API key provisioned.
- OTel collector running (to capture metrics/traces during load).

## Load scenarios

### Scenario 1: Sustained normal load

- **Goal:** Establish baseline performance under typical usage.
- **Profile:** 50 concurrent clients, each performing the BeginAction → tool call → CompleteAttempt cycle.
- **Duration:** 10 minutes.
- **Pass criteria:**
  - p50 BeginAction latency < 50ms
  - p95 BeginAction latency < 200ms
  - p99 BeginAction latency < 500ms
  - Zero 5xx errors
  - Zero data corruption (all actions have consistent state)

### Scenario 2: Burst abuse (spike)

- **Goal:** Verify control plane handles sudden traffic spikes gracefully.
- **Profile:** Ramp from 10 to 200 concurrent clients over 30 seconds, sustain for 5 minutes.
- **Pass criteria:**
  - No OOM crashes
  - 429 rate limiting kicks in (expected, not a failure)
  - Recovery to normal latency within 60 seconds of spike end
  - No data corruption

### Scenario 3: Repeated same-ActionKey flood

- **Goal:** Verify dedupe/replay under heavy duplication.
- **Profile:** 100 concurrent clients all sending the same ActionKey.
- **Pass criteria:**
  - Exactly ONE action created
  - Exactly ONE PROCEED decision; all others get REPLAY or PENDING
  - No duplicate attempts

### Scenario 4: Connection pool saturation

- **Goal:** Verify behavior when DB connections are exhausted.
- **Profile:** Overload connection pool limit with concurrent requests.
- **Pass criteria:**
  - Graceful 503 responses (not hangs or crashes)
  - Recovery after load decreases
  - No connection leaks

## Tooling

- Recommended: `k6`, `autocannon`, or `clinic` for Node.js profiling.
- Custom scripts in `apps/control-plane/src/__tests__/load/` (Vitest + concurrent HTTP clients).

## Reporting

- Capture: p50/p95/p99 latency, throughput (req/s), error rates, DB connection pool utilization.
- Store results as CI artifacts.
- Compare against previous runs for regression detection.

## Related

- [Implementation Plan Phase 8 Gate](Implementation%20Plan.md)
- [RB-OPS-005: Write-Heavy Load Harness](RB-OPS-005-write-heavy-load-harness.md)
