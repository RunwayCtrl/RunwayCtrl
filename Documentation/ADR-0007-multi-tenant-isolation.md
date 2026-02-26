# ADR-0007 — Multi-tenant isolation: tenant_id in every PK/unique constraint

| Field  | Value                                                           |
| ------ | --------------------------------------------------------------- |
| ADR ID | ADR-0007                                                        |
| Title  | Multi-tenant isolation: tenant_id in every PK/unique constraint |
| Status | ACCEPTED                                                        |
| Date   | January 21, 2026                                                |
| Owners | Platform                                                        |
| Tags   | security, tenancy, data model                                   |

---

## Context

RunwayCtrl must be safe-by-default for multi-tenant SaaS usage; tenant isolation is a correctness property.

## Decision

Every major table includes tenant_id. Uniqueness constraints and foreign keys are tenant-scoped. No cross-tenant queries or shared rows.

## Options considered

1. Single-tenant deployments only
2. Shared tables without tenant-scoped PKs (risky)
3. Tenant-scoped keys and constraints everywhere [chosen]

## Tradeoffs

### Pros

- Strong isolation model; reduces blast radius of bugs.
- Simplifies retention and per-tenant analytics later.

### Cons

- Adds index width and storage overhead.
- Requires consistent query patterns and tooling discipline.

## Consequences

Query builders and migrations must always include tenant_id in keys and joins.

## How we will validate

Security tests for tenant boundary; invariant checks in integration tests.

## References

- Data Model Spec
- Security Guidelines
