# ADR-0003 — BeginAction decision outcomes: PROCEED / PENDING / REPLAY

| Field  | Value                                                            |
| ------ | ---------------------------------------------------------------- |
| ADR ID | ADR-0003                                                         |
| Title  | BeginAction decision outcomes: PROCEED / PENDING / REPLAY / DENY |
| Status | ACCEPTED                                                         |
| Date   | January 21, 2026                                                 |
| Owners | Platform                                                         |
| Tags   | api, governor, semantics                                         |

---

## Context

A control plane must return meaningful outcomes that guide safe client behavior. Errors are not enough—PENDING and REPLAY are normal states.

## Decision

BeginAction returns a decision enum in the **200 response body**: PROCEED, PENDING, REPLAY_SUCCESS, REPLAY_FAILURE.

Governance denials (budget/lease/circuit) are represented as **standard HTTP errors** (409/429/503) with a stable `error_code` and optional `retry_after_ms`.

PENDING is a first-class response.

## Options considered

1. Always return 200 with a boolean allow/deny
2. Return only allow/deny and rely on polling for everything else
3. Return explicit decision states with stable semantics [chosen]

## Tradeoffs

### Pros

- Makes the system composable and predictable for SDKs and users.
- Supports coalescing and replay without complicated client heuristics.

### Cons

- More surface area to document and test.
- Clients must be taught that PENDING is not an error.

## Consequences

Error code spec and test matrix must treat PENDING/REPLAY as expected outcomes.

## How we will validate

Integration tests for all decisions + invariants:

- no attempts created on governance denial responses (409/429/503)
- REPLAY returns no new attempts

## References

- API Contract
- Error Codes + Retry Semantics Spec
- Test Plan + Scenario Matrix
