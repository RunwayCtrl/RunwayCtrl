# RunwayCtrl — Security Guidelines (v0.1)

This document defines the mandatory security requirements for RunwayCtrl.

RunwayCtrl is a multi-tenant control plane coordinating tool execution and storing a durable attempt ledger. The security goal is simple: prevent cross-tenant leaks, prevent secret leakage (especially via logs/telemetry), preserve ledger integrity, and remain operable under abuse.

| Field              | Value                                           |
| ------------------ | ----------------------------------------------- |
| Product            | RunwayCtrl                                      |
| Doc type           | Security guidelines                             |
| Version            | v0.1                                            |
| Audience           | Backend / SDK / Infra engineers                 |
| Normative language | MUST / SHOULD / MAY                             |
| Source of truth    | `Documentation/openapi.yaml` + ADRs + this file |

MUST = release gate for design partner / production.

---

## 1) Architecture approvals (what we can lock before building)

The following decisions are safe to approve up front because they reduce blast radius, prevent spec/code drift, and tighten compliance posture without requiring product features to be “done.”

### 1.1 Approved-by-default security architecture (v0.1)

1. **Control plane never executes third-party tool calls** in v0.1.
   - Tool calls are executed by client runtimes via the SDK.
   - This is a major reduction in SSRF and credential-handling surface.

2. **Postgres is the system of record** for execution facts.
   - Redis (if present) is strictly an accelerator and must not be required for correctness.

3. **Privacy-first ledger** (hashes + pointers by default).
   - Do not store raw tool request/response payloads in Postgres by default.
   - See `Documentation/ADR-0009-payload-capture-stance.md`.

4. **Tenant isolation is a correctness property, not a best effort.**
   - Every major table includes `tenant_id`.
   - All uniqueness constraints and foreign keys are tenant-scoped.
   - See `Documentation/ADR-0007-multi-tenant-isolation.md`.

5. **Contract-as-code is mandatory.**
   - OpenAPI is the source of truth: `Documentation/openapi.yaml`.
   - CI must fail on API drift (schemas, error codes, headers).
   - This is a security requirement because drift causes unsafe SDK behavior (retries, unknown outcomes, replay).

6. **Ledger integrity rules are enforced in the write path using CAS patterns.**
   - Terminal states must be immutable.
   - Completion/unknown endpoints must be idempotent.
   - See `Documentation/ADR-0004-invariants-cas-first.md`.

7. **Telemetry is allowlisted, not filtered.**
   - Only approved attributes can be emitted.
   - Everything else is dropped.
   - This is the only reliable way to prevent accidental PII/secret leaks at scale.

### 1.2 “If we ship nothing else, ship these controls”

These controls make the architecture sound for design partners:

- Per-tenant authentication (API keys in v0.1) with hashed storage and immediate revocation.
- Per-tenant and per-IP rate limiting and request size/time limits.
- Append-only audit log for sensitive operations.
- Enforced retention/deletion jobs (ledger + audit, per policy).
- A kill switch surface: disable a tenant and/or deny a tool/action quickly.

---

## 2) Threat model (baseline)

### 2.1 Trust boundaries

- **Client app / agent runtime:** untrusted.
- **RunwayCtrl SDK:** runs in an untrusted environment.
- **Control Plane API:** trusted boundary; exposed to the internet or a private edge.
- **Ledger (Postgres):** most sensitive asset (durable execution history).
- **OTel pipeline / log shipping:** data egress boundary.
- **Console UI (later):** human access boundary.

### 2.2 Attacker goals (examples)

- Exfiltrate tenant data from the ledger or telemetry.
- Steal API keys to impersonate a tenant.
- Cross-tenant access via IDOR bugs.
- DoS the service via high-QPS calls or amplification endpoints.
- Poison logs/traces with secrets/PII.
- Tamper with ledger integrity (delete/rewrite history).

### 2.3 Non-negotiable security properties

- **Tenant isolation:** no cross-tenant reads/writes.
- **Confidentiality:** secrets and sensitive payloads are not stored or leaked by default.
- **Integrity:** attempt history is append-only; terminal outcomes are immutable.
- **Availability:** abuse controls prevent one tenant (or attacker) from degrading the whole service.

---

## 3) Data handling (classification, minimization, retention)

### 3.1 Data classes

- **Public:** Documentation. Default policy: OK to store.
- **Internal:** Non-sensitive operational metadata. Default policy: OK to store.
- **Sensitive:** Resource identifiers, incident/ticket metadata, repo info. Default policy: store only if necessary; prefer hashes/pointers.
- **Secret:** API keys, OAuth tokens, credentials. Default policy: MUST NOT be stored in plaintext; avoid ingest entirely.

### 3.2 Data minimization rules (MUST)

- The ledger MUST store **hashes + metadata + pointers** by default (not raw payloads).
- Any field that can contain arbitrary user text MUST have:
  - length bounds
  - a documented redaction story (logs/OTel)
- Telemetry MUST NOT include tool payloads by default.

### 3.3 Payload capture (future; opt-in only)

If payload capture is added in v0.2+:

- It MUST be **off by default** and **opt-in per tenant**.
- Full artifacts MUST NOT be stored in Postgres; use object storage.
- Artifact reads/exports MUST be audited.
- Artifacts MUST have enforced TTL deletion.

### 3.4 Retention requirements (MUST)

Defaults (configurable per tenant):

- Attempts and attempt events: retain at least 30 days.
- Audit events: retain at least 90 days.
- Payload artifacts (if enabled): default off; if on, shortest practical TTL (e.g., 7 days).

Retention MUST be enforceable via scheduled jobs and must produce evidence (counts deleted, last run timestamp).

---

## 4) Authentication and authorization

### 4.1 API authentication (v0.1) (MUST)

- All non-meta endpoints MUST require authentication.
- v0.1 uses API keys:
  - stored hashed using Argon2id/bcrypt/scrypt
  - never logged
  - returned only at creation time
  - revocable immediately
- API keys SHOULD support rotation without downtime (multiple active keys per tenant).

### 4.2 Authorization and tenant isolation (MUST)

- Every request MUST resolve to a `tenant_id` derived from auth.
- Every DB query MUST be tenant-scoped.
- No endpoint may accept raw internal IDs without verifying tenant ownership.

Query patterns MUST look like:

- `WHERE tenant_id = $1 AND action_key = $2`
- `WHERE tenant_id = $1 AND attempt_id = $2`

### 4.3 Future auth (design constraint)

We design the auth module boundary so we can add:

- OIDC/SSO for console
- RBAC roles (`admin`, `operator`, `readonly`)
- SCIM provisioning

This is not required for v0.1, but the architecture MUST not block it.

---

## 5) API security controls

### 5.1 Transport security (MUST)

- All external traffic MUST use TLS 1.2+ (prefer TLS 1.3).
- HSTS SHOULD be enabled for browser-facing surfaces.

### 5.2 Abuse protection (MUST)

- Public API MUST enforce:
  - per-tenant rate limits
  - per-IP rate limits (edge/WAF preferred)
- The service MUST enforce request size limits and timeouts.
- Endpoints that can amplify load (e.g., `begin`) MUST have conservative defaults.

### 5.3 Input validation (MUST)

- All endpoints MUST validate inputs with strict schemas.
- Unknown fields SHOULD be rejected.
- Identifiers (action_key, attempt_id, resource_key) MUST have bounded length and charset.

### 5.4 Output hardening (MUST)

- Error responses MUST NOT leak stack traces, raw SQL, secrets, or cross-tenant identifiers.
- Every response (success or error) MUST include `X-Request-Id`.
- Error envelopes MUST match `Documentation/openapi.yaml` and `Documentation/Error Codes and Retry.md`.

### 5.5 Retry safety is a security feature (MUST)

Retry semantics can create duplicate side effects. Therefore:

- `error_code` values are a stable contract; drift is not allowed.
- When the server includes `retry_after_ms`, clients MUST obey it.
- Denial responses (RATE_LIMITED / BUDGET_DENIED / CIRCUIT_OPEN / LEASE_DENIED) MUST NOT create new attempts.

---

## 6) Ledger integrity and invariants

The ledger is a security boundary: it is the authoritative record of execution facts.

### 6.1 Append-only requirements (MUST)

- Attempt events MUST be append-only.
- The API MUST NOT expose endpoints that mutate historical events.
- Corrections MUST be new events, not edits.

### 6.2 Terminal immutability and idempotent completion (MUST)

Complete/unknown endpoints MUST be idempotent by `(tenant_id, attempt_id, terminal_state)`:

- repeating the same completion returns success (no-op)
- attempting a different terminal result returns 409 CONFLICT

This is required to prevent attackers (or buggy clients) from “flipping” outcomes.

### 6.3 Transactions are part of security (MUST)

Any operation that changes semantics MUST be atomic:

- upsert action + create attempt
- acquire lease
- complete attempt + mark action terminal

---

## 7) Multi-tenant isolation (implementation requirements)

### 7.1 Schema requirements (MUST)

- Every major table MUST include `tenant_id`.
- Uniqueness constraints and foreign keys MUST include `tenant_id`.

### 7.2 Service/repo requirements (MUST)

- Every repo function MUST require `tenant_id` as an input.
- The request context MUST carry `tenant_id` and `request_id`.
- Never fetch by `attempt_id` or `action_key` without tenant scoping.

### 7.3 Validation (MUST)

- Integration tests MUST include explicit tenant isolation tests for every new repo.
- Any bug that crosses tenant boundaries is a P0.

### 7.4 Analytics endpoints (MUST)

- All `/v1/insights/*` endpoints MUST be tenant-scoped (same `X-Tenant-Id` + API key auth as all other endpoints).
- The `execution_daily_stats` table MUST enforce RLS (`tenant_id = current_setting('app.tenant_id')`).
- Insights queries MUST NOT join or access data from other tenants.
- Analytics data is aggregate/statistical — but still tenant-confidential.

### 7.5 Multi-instance correctness (MUST)

- All tenant isolation guarantees MUST hold when multiple control-plane instances share the same Postgres.
- Multi-instance chaos tests (Phase 8A) MUST include a tenant isolation category: ensure that concurrent requests from different tenants on different instances never cross boundaries.

---

## 8) Observability security (logs, metrics, traces)

Telemetry is a frequent leak vector; treat it as data egress.

### 8.1 OTel attribute allowlist (MUST)

- Only allowlisted attributes may be emitted.
- Arbitrary user strings MUST NOT be attached to spans without length bounds and classification.

Allowed examples (subject to allowlist):

- `runwayctrl.tenant_id` (or hashed tenant id in shared environments)
- `runwayctrl.action_key`
- `runwayctrl.attempt_id`
- `runwayctrl.tool`
- `runwayctrl.action`
- `runwayctrl.failure_class`
- `runwayctrl.decision`

### 8.2 Log redaction (MUST)

- Logs MUST be structured.
- Logs MUST run through a redaction filter prior to emission.
- Redaction MUST cover Authorization headers, bearer tokens, API keys, and common secret formats.

### 8.3 Egress control (MUST)

- Telemetry exporters MUST be configurable per environment.
- Production egress destinations must be allowlisted.

---

## 9) Secrets management

### 9.1 Storage (MUST)

- Production secrets MUST live in a secrets manager.
- Secrets MUST NOT be committed to git.
- `.env` is allowed for local dev only and MUST remain uncommitted.

### 9.2 Handling (MUST)

- Never log secrets.
- Never include secrets in errors.
- Never include secrets in telemetry.

### 9.3 Rotation and revocation (MUST)

- API keys MUST support rotation and immediate revocation.
- Revocation/rotation events MUST be recorded in the audit log.

---

## 10) Infrastructure and supply chain

### 10.1 Network (MUST)

- The DB MUST NOT be publicly accessible.
- Control Plane should sit behind a reverse proxy / API gateway.
- Edge/WAF rules SHOULD be used when internet-exposed.

### 10.2 Runtime hardening (SHOULD)

- Run containers as non-root.
- Use read-only filesystem where feasible.
- Drop unnecessary Linux capabilities.
- Apply resource limits (CPU/mem).

### 10.3 Dependency and release integrity (MUST for design partner deployments)

- Lockfiles must be used.
- Dependency scanning must run in CI.
- Critical vulnerabilities MUST block release unless a formal exception exists.
- SBOM generation SHOULD be enabled for releases.

---

## 11) Audit logging and evidence

### 11.1 Audit log scope (MUST)

The system MUST record auditable events such as:

- API key created / rotated / revoked
- authentication failures (rate-limited)
- tenant disabled / re-enabled
- policy changes (when introduced)
- payload capture enabled/disabled (when introduced)
- artifact reads/exports (if artifacts exist)

Audit events MUST be tenant-scoped and append-only.

### 11.2 Evidence expectations (SOC2-capable posture)

For controls to “count,” we need artifacts:

- last successful retention job run
- audit log samples
- rate limit metrics
- key rotation runbook and test evidence

---

## 12) Incident response readiness

### 12.1 Kill switch (MUST)

We must be able to stop the bleeding quickly:

- disable a tenant
- deny a tool/action for a tenant
- open circuit globally for a dependency class

### 12.2 Runbooks (SHOULD)

Runbooks should exist for:

- auth failure spikes
- suspected tenant boundary breach
- DB saturation
- OTel pipeline failure

---

## 13) Build and release gates (security acceptance criteria)

### 13.1 Pull request gates (MUST)

A PR is not done unless:

- Endpoint schemas are validated and unknown fields are rejected (as configured).
- `tenant_id` is enforced end-to-end (middleware → service → repo → SQL).
- Errors do not leak sensitive info and match the OpenAPI + error taxonomy.
- Logs and telemetry comply with the allowlist/redaction rules.
- DB operations are parameterized and tenant-scoped.
- Any new ledger state transition includes CAS/idempotency tests.

### 13.2 Release gates (MUST for design partner environments)

- Dependency scan passes (or formal exception).
- Migrations reviewed; least-privilege DB roles validated.
- Backups enabled; restore procedure documented.
- Rate limits enabled.
- Retention jobs enabled and verified.

---

## 14) Implementation map (where these rules live)

This repo should enforce security by making misuse hard:

- `apps/control-plane/src/auth/*`: API key verification, tenant resolution, request context
- `apps/control-plane/src/errors/*`: safe error mapping + stable `error_code`
- `apps/control-plane/src/observability/*`: log redaction + OTel allowlist
- `apps/control-plane/src/ledger/*`: tenant-scoped repositories and transactional writes
- `apps/control-plane/src/migrations/*`: schema constraints (`tenant_id` in keys)

---

## 15) Appendix — minimal redaction patterns

The redaction filter MUST at least cover:

- `Authorization: Bearer <...>`
- `api_key=<...>`
- `token=<...>`
- `password=<...>`

In addition, consider redacting:

- cookies
- session IDs
- webhook secrets

---

## End of document
