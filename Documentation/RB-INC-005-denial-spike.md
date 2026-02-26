# RB-INC-005 - Denial spike (budget/lease/circuit/rate-limit)

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| Runbook ID         | RB-INC-005                                     |
| Title              | Denial spike (budget/lease/circuit/rate-limit) |
| Severity           | Sev2                                           |
| Owner              | Platform                                       |
| Last updated       | January 21, 2026                               |
| Primary dashboards | Governor Behavior; Control Plane Health        |
| Primary alerts     | BeginAction denied spike                       |

---

## Summary

Investigate spikes in BeginAction denials. Denials may be healthy containment or a misconfiguration.

## Symptoms

- runwayctrl.begin.denied.total increases
- customers report "stuck" or "denied" operations

## Diagnosis

1. Break down denials by deny_reason:
   - BUDGET_DENIED: governor caps
   - LEASE_DENIED: lock contention
   - CIRCUIT_OPEN: tool protection
   - RATE_LIMITED: downstream throttle
2. Verify if denials correlate with load or with a recent config change.

## Immediate containment

- If denials are unintentional (misconfig): revert policy config.
- If denials are intentional (containment): communicate status and provide Retry-After where appropriate.

## Resolution

- For LEASE_DENIED: see RB-INC-007.
- For CIRCUIT_OPEN: see RB-INC-006.
- For RATE_LIMITED: ensure backoff + jitter; reduce concurrency.

## Validation

- denial rate stabilizes at expected level
- successful completions recover
