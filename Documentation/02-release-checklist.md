# RunwayCtrl — Release Checklist (v0.1)

## A) Pre-flight

- [ ] PR approved, CI green
- [ ] Specs updated (API contract, error/retry, OTel) if impacted
- [ ] ADR added for long-lived decisions

## B) Staging validation

- [ ] Deploy immutable artifact
- [ ] Smoke: BeginAction → Complete → Status
- [ ] P0/P1 tests green
- [ ] OTel contract validator passes
- [ ] No elevated 5xx or p99 latency

## C) Migrations (if any)

- [ ] 2 reviewers, runtime + lock risk, backout plan
- [ ] Two-phase plan if breaking

## D) Prod rollout

- [ ] Canary 1–5% then ramp
- [ ] Monitor 5xx, p99, denials, UNKNOWN, circuits
- [ ] Golden trace verified

## E) After release

- [ ] Tag + release notes
- [ ] Follow-up issues filed
