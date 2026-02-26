# Tool Simulator Contract (v0.1)

A controllable HTTP service used for deterministic integration/E2E tests.

## Required modes

- SUCCESS: 200
- CLIENT_ERROR: 4xx
- SERVER_ERROR: 5xx
- RATE_LIMIT: 429 with Retry-After
- TIMEOUT: accept but never respond
- DROP: close TCP mid-flight

## Latency injection

- fixed latency
- jitter range
- tail profile (p95/p99)

## Suggested endpoints

- POST /simulate/config
- POST /simulate/reset
- POST /tool/do
