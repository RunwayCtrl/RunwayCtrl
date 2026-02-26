# RB-INC-002 - DB saturation / connection pool exhaustion

| Field              | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Runbook ID         | RB-INC-002                                                   |
| Title              | DB saturation / connection pool exhaustion                   |
| Severity           | Sev1                                                         |
| Owner              | Platform                                                     |
| Last updated       | January 21, 2026                                             |
| Primary dashboards | DB Health; Control Plane Health; Ledger Integrity            |
| Primary alerts     | DB connections high; DB query latency high; API latency high |

---

## Summary

Handles Postgres saturation, connection pool exhaustion, lock contention, or slow queries.

## Symptoms

- DB connection pool maxed
- DB query duration p95/p99 spikes
- API requests pile up or time out
- deadlocks/lock waits observed

## Diagnosis

1. Check DB connections vs max.
2. Check slow queries (top statements).
3. Check lock waits / deadlocks.
4. Identify hottest tables (actions/attempts/leasing).

## Immediate containment

- Shed load: increase DENY for non-critical actions (do not create attempts).
- Reduce concurrency governor caps to cut write pressure.
- Temporarily disable expensive background jobs if safe.

## Resolution

- Tune indexes for hottest query (longer-term fix).
- If lock contention: ensure updates are narrow + keyed by PK; avoid range scans.
- If migrations caused it: roll back deploy and/or revert migration step.

## Validation

- DB latency drops
- connection pool returns under threshold
- API p99 improves

## Escalation

- Page DBA/infra if you need to resize or failover.
