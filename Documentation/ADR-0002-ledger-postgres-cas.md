# ADR-0002 — Ledger-first persistence in Postgres with CAS updates

| Field  | Value                                                 |
| ------ | ----------------------------------------------------- |
| ADR ID | ADR-0002                                              |
| Title  | Ledger-first persistence in Postgres with CAS updates |
| Status | ACCEPTED                                              |
| Date   | January 21, 2026                                      |
| Owners | Platform                                              |
| Tags   | storage, ledger, consistency                          |

---

## Context

We need a durable attempt ledger to coordinate retries and prove side-effect safety. Writes must be correct under concurrency and partial failure.

## Decision

Use Postgres as the v0.1 system of record for actions/attempts/events. Enforce correctness primarily via application-layer CAS (compare-and-swap) updates and constraints.

## Options considered

1. Event-sourcing only (append-only log + projections)
2. No ledger (stateless proxy) and rely on downstream idempotency
3. Relational ledger in Postgres with CAS + constraints [chosen]

## Tradeoffs

### Pros

- Simple operational footprint; strong transactional semantics for v0.1.
- Straightforward querying for debugging and reconciliation.
- CAS patterns align with invariant enforcement and idempotent completion.

### Cons

- Scaling requires careful indexing and partitioning strategy later.
- Cross-region active/active is non-trivial (future ADR).

## Consequences

Data model and indexes become product-critical; migrations need discipline.

## How we will validate

Component/integration tests verify uniqueness, CAS idempotency, and invariant preservation.

## References

- Data Model Spec
- State Machines + Invariants Spec
