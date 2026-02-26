# RB-INC-008 - Duplicate side effects suspected

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| Runbook ID         | RB-INC-008                                      |
| Title              | Duplicate side effects suspected                |
| Severity           | Sev0                                            |
| Owner              | Platform                                        |
| Last updated       | January 21, 2026                                |
| Primary dashboards | Ledger Integrity; Tool Reliability              |
| Primary alerts     | Customer report of duplicates; anomaly detector |

---

## Summary

This is the nightmare scenario: a side effect may have been applied more than once.

## Symptoms

- customer reports duplicate create/update at downstream tool
- ledger shows multiple SUCCESS attempts for same action (should not happen)

## Impact

Potential financial or irreversible downstream state. Treat as Sev0.

## Immediate containment (DO FIRST)

1. Freeze the affected tool/action:
   - open circuit (deny new PROCEED) for the tool/action.
2. Reduce concurrency to zero for that tool/action.
3. Preserve evidence:
   - export ledger rows for the action_key
   - capture traces/logs (without secrets)

## Diagnosis

1. Check if duplicates are truly the same ActionKey intent:
   - confirm action_key strategy is correct.
2. Identify failure mode:
   - tool succeeded but client timed out, then replay created a new side effect
   - downstream tool is not idempotent and we lacked a tool-side idempotency key
3. Validate invariants and CAS code paths.

## Resolution

- Fix replay logic so terminalized actions always REPLAY without new attempts.
- If possible, add downstream idempotency key header/body to tool adapters.
- Add a P0 regression test for the specific failure mode.

## Customer remediation

- Coordinate with customer; consider a compensating action plan (manual or automated).

## Validation

- No additional duplicates after containment
- Regression test added and passing

## Escalation

- Page platform lead and security lead immediately.
