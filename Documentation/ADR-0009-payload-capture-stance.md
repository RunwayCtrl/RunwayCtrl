# ADR-0009 — Payload capture stance (hashes/pointers default; opt-in artifacts)

| Field  | Value                                                              |
| ------ | ------------------------------------------------------------------ |
| ADR ID | ADR-0009                                                           |
| Title  | Payload capture stance (hashes/pointers default; opt-in artifacts) |
| Status | ACCEPTED                                                           |
| Date   | January 29, 2026                                                   |
| Owners | Platform                                                           |
| Tags   | security, privacy, ledger, compliance                              |

---

## Context

RunwayCtrl coordinates and records tool execution attempts for many tenants. Tool inputs/outputs can contain sensitive customer data (PII, incident details, code, credentials). Persisting raw payloads by default increases:

- breach blast radius
- compliance scope and procurement friction
- operational cost (storage/indexing/backups)
- accidental leakage risk via logs and telemetry

At the same time, some customers want deeper forensics ("what exactly was sent/received?") for debugging and auditing.

## Decision

For v0.1:

- The Postgres ledger stores **metadata + hashes + pointers** (e.g., `request_hash`, `outcome_hash`, `outcome_pointer`) and **does not** store raw tool request/response payloads by default.
- Payload capture, if supported in later versions, is **opt-in per tenant** (and optionally per tool/action).
- When payload capture is enabled, full artifacts must be stored **outside Postgres** (object storage), with the ledger storing only an **artifact pointer** plus integrity metadata.

## Options considered

1. Store full request/response payloads in Postgres by default
2. Never store payloads anywhere (hashes only, no option)
3. Default to hashes/pointers; allow opt-in redacted/external artifact storage later **[chosen]**

## Tradeoffs

### Pros

- Strong privacy-by-default posture (lower trust barrier for adoption).
- Reduces compliance surface area and breach impact.
- Keeps the ledger performant and operationally lean.
- Preserves a future path for deep forensics without changing core semantics.

### Cons

- Debugging can be harder without payload visibility unless customers opt in.
- Supporting opt-in artifacts later requires additional controls:
  - access control (RBAC)
  - audit logging for artifact access
  - retention/TTL enforcement and deletion jobs
  - encryption and key management

## Consequences

- Schema and APIs must treat `outcome_pointer` as a first-class concept.
- Logging/OTel must remain payload-free by default.
- If artifact storage is added, it must be integrated with tenant configuration, retention, and audited access.

## How we will validate

- Tests ensure ledger records do not include raw payload fields.
- Security review verifies payload capture is OFF by default.
- If/when opt-in artifacts are added:
  - audit log covers reads/exports
  - retention cleanup job deletes expired artifacts and reconciles pointers

## References

- `Documentation/Security Guidelines.md`
- `Documentation/PRD Document.md`
- `Documentation/Backend Structure.md`
- `Documentation/Flow Document.md`
- `Documentation/ADR-0002-ledger-postgres-cas.md`
