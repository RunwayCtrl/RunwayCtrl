# RB-INC-006 - Circuit stuck OPEN or flapping

| Field              | Value                                   |
| ------------------ | --------------------------------------- |
| Runbook ID         | RB-INC-006                              |
| Title              | Circuit stuck OPEN or flapping          |
| Severity           | Sev2                                    |
| Owner              | Platform                                |
| Last updated       | January 21, 2026                        |
| Primary dashboards | Tool Reliability; Governor Behavior     |
| Primary alerts     | Circuit open too long; circuit flapping |

---

## Summary

Circuit breakers protect downstream tools. This runbook covers circuits that are stuck OPEN or oscillating.

## Symptoms

- begin denials with CIRCUIT_OPEN
- circuit.open gauge stays 1 for long periods
- tool call errors/latency unstable

## Diagnosis

1. Confirm the underlying tool is truly degraded (latency, errors, 429).
2. Verify probe logic (half-open) is running.
3. Check for bad thresholds (too sensitive) causing flapping.

## Immediate containment

- If tool is still degraded: keep circuit OPEN (containment is correct).
- If tool is healthy but circuit stuck: reset circuit state carefully (manual override).

## Resolution

- Fix probe scheduling or state transitions.
- Tune thresholds (error rate window, minimum requests) to avoid flapping.

## Validation

- circuit transitions OPEN -> HALF_OPEN -> CLOSED when tool is healthy
- denials decrease appropriately
