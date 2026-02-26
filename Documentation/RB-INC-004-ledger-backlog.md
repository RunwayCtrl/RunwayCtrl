# RB-INC-004 - Ledger backlog / stuck IN_FLIGHT attempts

| Field              | Value                                             |
| ------------------ | ------------------------------------------------- |
| Runbook ID         | RB-INC-004                                        |
| Title              | Ledger backlog / stuck IN_FLIGHT attempts         |
| Severity           | Sev2                                              |
| Owner              | Platform                                          |
| Last updated       | January 21, 2026                                  |
| Primary dashboards | Ledger Integrity; Worker Health; DB Health        |
| Primary alerts     | Attempts stuck IN_FLIGHT; worker queue depth high |

---

## Summary

Handles build-up of in-flight attempts and slow terminalization.

## Symptoms

- attempts.in_flight gauge rises
- many attempts older than threshold
- worker queues backing up

## Diagnosis

1. Is this a worker outage (no consumers) or DB slowness?
2. Are attempts stuck because tool calls are slow, or because completion calls are failing?
3. Is there a deadletter condition (retries exhausted)?

## Immediate containment

- Reduce new PROCEED decisions (deny or pending) to stop backlog growth.
- Ensure worker autoscaling (if available) is not capped.
- Pause non-critical jobs.

## Resolution

- Restart/repair worker processing.
- Fix DB performance if it is blocking ledger updates (RB-INC-002).
- Reconcile stuck attempts:
  - if tool outcome is known, complete attempt.
  - if unknown, mark UNKNOWN and force polling.

## Validation

- backlog drains
- old in-flight attempts count returns to baseline
