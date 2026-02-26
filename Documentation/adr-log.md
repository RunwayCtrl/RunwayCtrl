# RunwayCtrl — ADR Log (Architecture Decision Records) (v0.1)

| Field    | Value                                                                                   |
| -------- | --------------------------------------------------------------------------------------- |
| Product  | RunwayCtrl                                                                              |
| Doc Type | ADR Log                                                                                 |
| Version  | v0.1                                                                                    |
| Date     | January 21, 2026                                                                        |
| Purpose  | Track _why_ key architectural decisions were made and what alternatives were considered |

---

## 1) What an ADR is (brief)

An **ADR (Architecture Decision Record)** captures:

- the decision
- the context/problem
- the options considered
- the tradeoffs
- the consequences (good and bad)
- references to specs / PRs / issues

ADRs prevent “architectural amnesia” and make onboarding and refactors sane.

---

## 2) ADR lifecycle + statuses

### Status values

- **PROPOSED**: being evaluated
- **ACCEPTED**: approved and implemented (or implementation underway)
- **DEPRECATED**: still in use, but planned for removal
- **SUPERSEDED**: replaced by a newer ADR
- **REJECTED**: explicitly not chosen

### Rules (MUST)

- Every ADR has a stable ID: `ADR-0001`, `ADR-0002`, ...
- Do not rewrite history: if something changes, create a new ADR and mark old as SUPERSEDED.
- ADRs should link to:
  - API Contract
  - Data Model Spec
  - State Machines + Invariants
  - Observability + OTel Contract
  - Error Codes + Retry Semantics

---

## 3) ADR index (canonical log)

> The index below is the table of contents for architecture decisions.

| ADR ID   | Title                                                                          | Status   | Date             | Owners   | References                                           |
| -------- | ------------------------------------------------------------------------------ | -------- | ---------------- | -------- | ---------------------------------------------------- |
| ADR-0001 | ActionKey as the canonical idempotency surface                                 | ACCEPTED | January 21, 2026 | Platform | State Machines + Invariants; API Contract            |
| ADR-0002 | Ledger-first persistence in Postgres with CAS updates                          | ACCEPTED | January 21, 2026 | Platform | Data Model Spec; State Machines + Invariants         |
| ADR-0003 | BeginAction decision outcomes: PROCEED / PENDING / REPLAY                      | ACCEPTED | January 21, 2026 | Platform | API Contract; Error/Retry Spec                       |
| ADR-0004 | Enforce invariants in the application layer (CAS) first; add DB triggers later | ACCEPTED | January 21, 2026 | Platform | State Machines + Invariants                          |
| ADR-0005 | OpenTelemetry-first observability contract (spans/metrics/logs)                | ACCEPTED | January 21, 2026 | Platform | Observability + OTel Contract                        |
| ADR-0006 | Retry governance: budgets + jitter + Retry-After compliance                    | ACCEPTED | January 21, 2026 | Platform | Error Codes + Retry Semantics                        |
| ADR-0007 | Multi-tenant isolation: tenant_id in every PK/unique constraint                | ACCEPTED | January 21, 2026 | Platform | Data Model Spec; Security Guidelines                 |
| ADR-0008 | API-first v0.1: UI is optional; correctness + ops come first                   | ACCEPTED | January 21, 2026 | Platform | PRD; Backend Structure                               |
| ADR-0009 | Payload capture stance: hashes/pointers default; opt-in artifacts              | ACCEPTED | January 29, 2026 | Platform | PRD; Security Guidelines; Backend Structure          |
| ADR-0010 | Ledger Insights: analytics + cost optimization from durable data               | ACCEPTED | January 21, 2026 | Platform | Data Model Spec; Observability; OTel Contract        |
| ADR-0011 | Multi-instance correctness + chaos validation harness                          | ACCEPTED | January 21, 2026 | Platform | Infra Blueprint; Security Guidelines; State Machines |

---

## 4) How to add a new ADR (workflow)

1. Copy `Documentation/adr-template.md` to `Documentation/ADR-XXXX-title-slug.md`
2. Fill it out
3. Add a row to `Documentation/adr-log.md`
4. Submit as a PR with:
   - the ADR
   - any linked spec changes

---

## 5) Files in this export

- `Documentation/adr-log.md` (this file)
- `Documentation/adr-template.md` (template)
- `Documentation/ADR-0001-actionkey-idempotency.md`
- `Documentation/ADR-0002-ledger-postgres-cas.md`
- `Documentation/ADR-0003-beginaction-decisions.md`
- `Documentation/ADR-0004-invariants-cas-first.md`
- `Documentation/ADR-0005-otel-contract-first.md`
- `Documentation/ADR-0006-retry-governance.md`
- `Documentation/ADR-0007-multi-tenant-isolation.md`
- `Documentation/ADR-0008-api-first-v01.md`
- `Documentation/ADR-0009-payload-capture-stance.md`
- `Documentation/ADR-0010-ledger-insights-analytics.md`
- `Documentation/ADR-0011-multi-instance-chaos-validation.md`
