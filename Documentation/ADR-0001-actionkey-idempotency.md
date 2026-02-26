# ADR-0001 — ActionKey as the canonical idempotency surface

| Field  | Value                                          |
| ------ | ---------------------------------------------- |
| ADR ID | ADR-0001                                       |
| Title  | ActionKey as the canonical idempotency surface |
| Status | ACCEPTED                                       |
| Date   | January 21, 2026                               |
| Owners | Platform                                       |
| Tags   | api, idempotency, ledger                       |

---

## Context

RunwayCtrl must prevent duplicate side effects under retries, timeouts, and concurrency. We need a stable, semantic identifier that represents _intent_, not a single network call.

## Decision

Introduce `action_key` (a.k.a. ActionKey) as the canonical idempotency surface. There is exactly one Action row per (tenant_id, action_key). BeginAction decisions are based on the current Action status, enabling REPLAY/PENDING semantics.

## Options considered

1. Use request_id only (per HTTP call idempotency)
2. Use attempt_id only (each attempt unique, no dedupe)
3. Use a semantic ActionKey (idempotency by intent) [chosen]

## Tradeoffs

### Pros

- Stops double-writes when the tool succeeded but the client timed out.
- Enables deterministic replay semantics and coalescing (herd collapse).
- Makes auditing simple: all attempts for a single intent are grouped.

### Cons

- Requires clients to define ActionKey strategy correctly.
- High-cardinality identifier (must not be used as a metrics label).

## Consequences

SDK and API contract must treat ActionKey as first-class; DB uniqueness is required.

## How we will validate

P0 tests: herd collapse, timeout-but-success (UNKNOWN), and replay-after-terminal scenarios.

## References

- State Machines + Invariants Spec
- API Contract
- Error Codes + Retry Semantics Spec
