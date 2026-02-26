# ADR-0004 — Enforce invariants in the application layer (CAS) first; add DB triggers later

| Field  | Value                                                                          |
| ------ | ------------------------------------------------------------------------------ |
| ADR ID | ADR-0004                                                                       |
| Title  | Enforce invariants in the application layer (CAS) first; add DB triggers later |
| Status | ACCEPTED                                                                       |
| Date   | January 21, 2026                                                               |
| Owners | Platform                                                                       |
| Tags   | consistency, db, invariants                                                    |

---

## Context

We must prevent invalid state transitions and terminal flipping. DB triggers add safety but slow iteration early.

## Decision

v0.1 enforces invariants via CAS update patterns in the service layer. Optional DB triggers/checks are deferred to a later hardening milestone.

## Options considered

1. Heavy DB triggers and constraints from day 1
2. Only application logic; no DB enforcement
3. CAS-first in app + minimal constraints; add triggers later [chosen]

## Tradeoffs

### Pros

- Fast iteration with clear correctness model.
- Keeps database schema simpler early.
- CAS already required for idempotency and concurrency.

### Cons

- Bugs can slip through if CAS code is wrong.
- Later adding triggers requires careful migration and backfill.

## Consequences

Test suite must aggressively validate invariants; code review must treat invariants as sacred.

## How we will validate

P0 invariant tests + property tests; optional integration test that simulates race conditions.

## References

- State Machines + Invariants Spec
