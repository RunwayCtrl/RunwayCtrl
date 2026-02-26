# RB-INC-001 - API elevated 5xx / latency

| Field              | Value                                              |
| ------------------ | -------------------------------------------------- |
| Runbook ID         | RB-INC-001                                         |
| Title              | API elevated 5xx / latency                         |
| Severity           | Sev1                                               |
| Owner              | Platform                                           |
| Last updated       | January 21, 2026                                   |
| Primary dashboards | Control Plane Health; Governor Behavior; DB Health |
| Primary alerts     | API error rate high; API p99 latency high          |

---

## Summary

This runbook covers spikes in HTTP 5xx or sustained p95/p99 latency on RunwayCtrl API routes.

## Symptoms

- 5xx rate rises (especially /v1/actions/begin)
- p99 latency spikes
- timeouts from SDK
- rising retry traffic

## Impact

- BeginAction decisions become slow or fail
- clients retry -> risk of storm

## Diagnosis (10 minutes max)

1. Identify worst route(s) by error and latency.
2. Check saturation signals: CPU, memory, DB pool, queue depth.
3. Check governor decisions: are we DENYing more (containment) or failing?
4. Check downstream/tool errors: are we blocked on an external dependency?

## Immediate containment (safe)

- Enable/raise denial thresholds for non-critical tools/actions (BUDGET_DENIED).
- Reduce max concurrency per tenant/tool to stop a storm.
- If DB is the bottleneck: temporarily increase pool (if safe) or shed load.

## Resolution

- If errors are internal: roll back last deploy (see RB-OPS-001).
- If DB is saturated: follow RB-INC-002.
- If a specific tool/action is melting: open circuit for that tool/action (RB-INC-006).

## Validation

- 5xx rate returns to baseline
- p99 latency improves
- denial rate is stable and intentional (not accidental)

## Escalation

- Page DB/oncall if DB saturation indicators are high.
- Page platform lead if rollback does not recover within 15 minutes.
