# ADR-0006 — Retry governance: budgets + jitter + Retry-After compliance

| Field  | Value                                                       |
| ------ | ----------------------------------------------------------- |
| ADR ID | ADR-0006                                                    |
| Title  | Retry governance: budgets + jitter + Retry-After compliance |
| Status | ACCEPTED                                                    |
| Date   | January 21, 2026                                            |
| Owners | Platform                                                    |
| Tags   | retries, safety, governor                                   |

---

## Context

Naive retries cause retry storms and thundering herds—especially under rate limiting or tail latency.

## Decision

RunwayCtrl defines retry governance: retry budgets, backoff with jitter, and strict handling of Retry-After. Denials do not create attempts; PENDING directs the client to wait/poll.

## Options considered

1. Let the SDK retry independently with exponential backoff
2. Centralized retry policy in server (budgets + deny semantics) [chosen]
3. No retry guidance; treat as client concern

## Tradeoffs

### Pros

- Prevents synchronized retry herds and protects downstream APIs.
- Makes system behavior consistent across clients and languages.

### Cons

- Harder to get perfectly right; must be tested under chaos.
- Policy tuning required per tool/action.

## Consequences

Error codes, headers, and SDK behavior are coupled to retry policy.

## How we will validate

P0/P1 chaos tests for 429/Retry-After + timeouts; load tests for herd collapse.

## References

- Error Codes + Retry Semantics Spec
- Test Plan + Scenario Matrix
