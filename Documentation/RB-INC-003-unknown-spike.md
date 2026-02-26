# RB-INC-003 - Attempt UNKNOWN spike

| Field              | Value                                                 |
| ------------------ | ----------------------------------------------------- |
| Runbook ID         | RB-INC-003                                            |
| Title              | Attempt UNKNOWN spike                                 |
| Severity           | Sev2                                                  |
| Owner              | Platform                                              |
| Last updated       | January 21, 2026                                      |
| Primary dashboards | Tool Reliability; Ledger Integrity; Governor Behavior |
| Primary alerts     | UNKNOWN outcomes high                                 |

---

## Summary

Covers spikes in UNKNOWN attempts (ambiguous outcomes), usually from tool timeouts or network drops.

## Symptoms

- runwayctrl.attempts.unknown.total increases sharply
- clients poll more
- higher retry load

## Impact

- Work completion slows
- risk of duplicate side effects if replay is wrong

## Diagnosis

1. Identify top tool/action causing UNKNOWN.
2. Check if UNKNOWN correlates with tool latency spikes or 429s.
3. Verify replay semantics: BeginAction should return PENDING/REPLAY without creating duplicate attempts.

## Immediate containment

- Open circuit for the failing tool/action to stop attempting new work (RB-INC-006).
- Reduce concurrency for that tool/action.
- Increase join window or enforce stricter coalescing (if configurable) to prevent duplicate attempts.

## Resolution

- Fix tool timeout settings and ensure SDK uses mark_unknown + polling correctly.
- If tool is degraded externally, keep circuit open and communicate status.

## Validation

- UNKNOWN rate returns to baseline
- PENDING/REPLAY rates normalize
- No duplicate SUCCESS attempts per action observed in ledger

## Escalation

- If UNKNOWN is accompanied by suspected duplicate side effects, jump to RB-INC-008.
