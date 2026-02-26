# RB-INC-007 - Lease contention / deadlock symptoms

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| Runbook ID         | RB-INC-007                                     |
| Title              | Lease contention / deadlock symptoms           |
| Severity           | Sev2                                           |
| Owner              | Platform                                       |
| Last updated       | January 21, 2026                               |
| Primary dashboards | Governor Behavior; DB Health; Ledger Integrity |
| Primary alerts     | Lease denied spike; lock wait high             |

---

## Summary

Leases prevent concurrent side effects on the same resource. High contention can throttle throughput or cause lock waits.

## Symptoms

- lease.denied counter rises
- BeginAction latency increases
- DB lock waits increase

## Diagnosis

1. Identify top resource_key patterns (avoid logging raw keys in shared systems).
2. Determine if contention is expected (hot resource) or accidental (too broad keys).
3. Verify lease TTL and renew logic.

## Immediate containment

- Reduce concurrency for the contested tool/action.
- If resource_key is too coarse, temporarily scope it more narrowly (requires deploy/config).

## Resolution

- Refine resource_key strategy.
- Ensure CAS updates for lease acquisition to avoid lock contention.
- Tune lease TTL and join window to reduce churn.

## Validation

- lease.denied drops
- BeginAction latency improves
