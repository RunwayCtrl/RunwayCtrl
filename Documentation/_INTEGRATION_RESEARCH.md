# Integration Research — v0.1 Candidates

> **Temporary file.** Delete once final integration picks are locked.

## v0.1 Locked In (Feb 26, 2026)

| #   | Integration    | Status     | Strategy                    | Why                                                                                                                                                                                                                                                       |
| --- | -------------- | ---------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **GitHub**     | **LOCKED** | Market + Build              | Zero native idempotency on PRs, issues, comments, workflow triggers. Developer workflow. Primary design partner surface.                                                                                                                                  |
| 2   | **Jira**       | **LOCKED** | Market + Build              | Zero native idempotency on issue creation, comments, subtasks, links. New per-issue write rate limits landing March 2, 2026. Massive enterprise market (250K+ orgs). Atlassian slow to self-solve.                                                        |
| 3   | **ServiceNow** | **LOCKED** | Build + Test (market later) | Zero native idempotency on ALL table API writes. Shared rate limits per instance. No API-level locking for external callers. $12.9B revenue, 85% Fortune 500. Build SDK with it, test all guarantees, but don't heavily market until enterprise traction. |

## Demoted / Eliminated (with evidence)

| Integration     | Status             | Why                                                                                                                            |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| PagerDuty       | Nice-to-have (#4+) | Native `incident_key`/`dedup_key` covers most dedupe value. 3 of 5 actions already idempotent. Good story, weak technical gap. |
| Stripe          | **ELIMINATED**     | Native `Idempotency-Key` on ALL POST endpoints. Gold standard. Zero gap.                                                       |
| AWS APIs        | **ELIMINATED**     | Native `ClientToken`, Lambda durable execution, CLI auto-retry. Solved for 15 years.                                           |
| Terraform Cloud | **ELIMINATED**     | Workspace locking provides native lease-like protection. 409 on conflicts. Low gap.                                            |
| Linear          | **ELIMINATED**     | Building own Agent API + agent sessions. High competitive self-solve risk. Small market (12%).                                 |
| Slack           | Deferred           | Wide dedupe gap but LOW stakes. Duplicate messages ≠ catastrophic. Future integration.                                         |
| Jenkins         | **ELIMINATED**     | Declining market. No strategic fit.                                                                                            |
| CircleCI        | **ELIMINATED**     | Declining market. Shrinking share.                                                                                             |
| ArgoCD          | **ELIMINATED**     | GitOps model is inherently idempotent. Low gap.                                                                                |

## Deep Dive Findings (Feb 26, 2026)

### Key Insight: Leases (Guarantee C) may be MORE valuable than Dedup (Guarantee A)

- Jira: Concurrent transitions return 409 but offer no coordination primitive. Atlassian tells callers to "employ a retry mechanism" without offering one.
- ServiceNow: GlideMutex exists server-side only. REST API callers get ZERO locking.
- Neither platform has external-caller coordination. RunwayCtrl is the ONLY layer that exists here.

### Jira: 19 of 40 guarantee×action cells rated HIGH+

### ServiceNow: 30 of 50 guarantee×action cells rated HIGH+ (strongest integration)

### Timing: Jira new points-based rate limits enforce March 2, 2026 — 4 days away.

### The real pitch (refined by research):

> "We're not saying Jira or ServiceNow is broken. We're saying neither was designed for the access pattern of autonomous agents. No coordination layer exists between your agents and the APIs they're racing over. That's RunwayCtrl."
