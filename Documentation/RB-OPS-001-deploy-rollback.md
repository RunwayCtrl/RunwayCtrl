# RB-OPS-001 - Deploy rollback

| Field              | Value                                     |
| ------------------ | ----------------------------------------- |
| Runbook ID         | RB-OPS-001                                |
| Title              | Deploy rollback                           |
| Severity           | Sev1                                      |
| Owner              | Platform                                  |
| Last updated       | January 21, 2026                          |
| Primary dashboards | Control Plane Health; Error rate; Latency |
| Primary alerts     | Regressions after deploy                  |

---

## Summary

Fast rollback steps when a deploy introduces errors or latency.

## Symptoms

- spike begins immediately after deploy
- new error signature in logs

## Immediate containment

- Roll back to last known good version (one click/command).
- If rollback is slow, shed load by denying non-critical actions.

## Resolution

- Confirm rollback completed across all instances.
- Validate health checks and golden route (/v1/actions/begin).

## Validation

- error and latency return to baseline

## Post-incident

- Create an ADR or postmortem note if the rollback reveals a process gap.
