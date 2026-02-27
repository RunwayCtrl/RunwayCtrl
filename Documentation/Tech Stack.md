# RunwayCtrl — Tech Stack (v0.1)

This document defines the v0.1 tech stack for RunwayCtrl, grounded in what is actually present in the repo today and aligned with:

- `Documentation/RUNWAYCTRL_PROJECT_OVERVIEW.md`
- `Documentation/Security Guidelines.md`
- `Documentation/openapi.yaml`

This is not a wishlist. If we mention a tool/framework here, it should either exist in the repo now or be explicitly marked as “planned.”

---

## 1) Non-negotiable stack requirements

These requirements exist to support the product contract (idempotency-in-practice, governed retries, leases, explainability) and the security posture (multi-tenant, minimization, allowlisted telemetry):

- **Contract-as-code:** OpenAPI is the source of truth; CI must fail on schema + error-code drift.
- **Multi-tenant isolation:** `tenant_id` everywhere; tenant-scoped unique constraints and query patterns.
- **Ledger integrity:** append-only events + CAS-enforced terminal immutability.
- **Privacy-first by default:** hashes/pointers in the ledger; payload capture is off unless explicitly enabled later.
- **Telemetry minimization:** allowlist attributes (don’t “filter,” allowlist).
- **Abuse controls:** rate limiting, request size/time limits, and a kill switch surface.

---

## 2) Reality snapshot (what exists in this repo)

### 2.1 Implemented foundations

- **Language:** TypeScript
- **Runtime:** Node.js (repo requires Node >= 20)
- **Monorepo tooling:** pnpm workspaces
- **Control plane framework:** Fastify (`apps/control-plane`)
- **Validation:** Zod (`apps/control-plane`)
- **Auth hashing:** Argon2 (`apps/control-plane`)
- **Ledger DB:** Postgres via `pg` (`packages/db`)
- **Config:** `dotenv` in DB package (repo root `.env` pattern)
- **Observability:** OpenTelemetry SDKs/exporters in control plane
- **Testing:** Vitest
- **Lint/format:** ESLint + Prettier

### 2.2 Present but intentionally deferred / placeholder

- `apps/console` exists but is explicitly scaffolded-only (build/lint/tests are deferred).
- `packages/sdk-core` exists but is currently minimal and has no dependencies (placeholder stage).

---

## 3) v0.1 target architecture (components)

v0.1 is a control plane plus a minimal SDK wrapper. The control plane coordinates; it does not execute third-party tool calls.

Components:

1. **SDK (client-side)**
   - runs in an untrusted environment
   - calls Control Plane API for decisions (begin/replay/pending)
   - executes the tool call only after `PROCEED`
   - reports completion/unknown

2. **Control Plane API (server-side)**
   - enforces semantics: idempotency decisions, retry governance, leases
   - writes durable execution facts to Postgres
   - emits allowlisted telemetry

3. **Ledger (Postgres)**
   - system of record for actions/attempts/events/leases
   - enables explainability and replay decisions

Optional v0.1 accelerator:

- **Redis** may be added later for ephemeral counters, but must never be required for correctness.

### 3.2 Background workers

- **Insights aggregation worker** — a scheduled process (cron or pg_cron) that computes daily execution stats from raw ledger data into `execution_daily_stats`. Runs within the control-plane process or as a separate lightweight worker. Emits OTel metrics for health monitoring.
- **Hub analysis job** — runs after the aggregation worker (daily). Sends aggregated stats to the configured LLM provider, validates the response with Zod, and persists pre-computed insights into the `hub_analyses` table. Gated by the `ENABLE_HUB` feature flag and a minimum-data threshold.

---

## 4) Languages, runtime, and packaging

### 4.1 Language choices

- **TypeScript** for control plane + SDKs.
- **SQL** for schema/migrations.

Rationale:

- Shared types and schemas reduce drift.
- TypeScript is fast to iterate and broadly adoptable for design partners.

### 4.2 Runtime

- **Node.js >= 20**.
- `tsx` for local dev execution.

---

## 5) Control plane stack

### 5.1 HTTP server

- **Fastify**

Why:

- performance and low overhead
- clean plugin model for auth, request context, error mapping

### 5.2 Validation and schemas

- **Zod** for runtime validation.

Rule:

- Zod validation must match OpenAPI semantics (and ideally be generated or contract-tested).

### 5.3 Authentication

- **API keys** in v0.1
- API keys are stored **hashed** (Argon2) and never logged.

---

## 6) Ledger stack (Postgres)

### 6.1 Database choice

- **PostgreSQL** is the v0.1 ledger.

Why:

- transactional semantics for atomic operations
- strong consistency where it matters (begin, complete, leases)
- mature operational ecosystem

### 6.2 DB access

- `pg` for Postgres connectivity.

DB security alignment:

- separate migration role vs app role (least privilege)
- TLS in production
- DB is not publicly accessible

### 6.3 Concurrency primitive

- **Lease rows** (not advisory locks) are the primary concurrency primitive.

Required behavior (matches `Documentation/Error Codes and Retry.md`):

- lease denials are typed (`LEASE_DENIED`)
- denials include deterministic `retry_after_ms` derived from `expires_at`

---

## 7) Observability stack (OTel)

### 7.1 Standards

- **OpenTelemetry** for traces and metrics.

### 7.2 Export

- Use OTLP exporters (HTTP) from the control plane.
- Run an OpenTelemetry Collector in local dev and production.

Security alignment:

- attribute allowlist is mandatory
- no raw tool payloads in spans/logs by default
- egress destinations must be allowlisted per environment

---

## 8) SDK stack (v0.1)

### 8.1 SDK responsibility boundaries

The SDK MUST:

- call `POST /v1/actions/begin` and only execute tool calls after `PROCEED`
- on timeout/ambiguity, call `POST /v1/attempts/{attempt_id}/unknown` then poll action status
- obey `retry_after_ms` (server guidance is authoritative)

The SDK MUST NOT:

- store secrets for customers
- emit arbitrary user strings into telemetry

### 8.2 Packaging

v0.1 packages (as they exist today):

- `@runwayctrl/sdk-core` (placeholder today; will own keying + normalization + small shared types)
- `@runwayctrl/sdk-node` (planned)

---

## 8.5) The Hub — LLM execution analysis layer

### 8.5.1 What it is

The Hub is an async, server-side intelligence layer that analyzes aggregated execution data from the durable ledger and produces pre-computed, human-readable insights. It runs daily (after the insights aggregation worker), stores its output in a `hub_analyses` table, and serves results via `GET /v1/insights/hub`.

Think: **Stripe Radar for agent execution** — pattern detection, anomaly flagging, and optimization recommendations powered by LLM analysis of execution history.

### 8.5.2 LLM provider

- **Default:** OpenAI GPT-5.2
- **Provider-configurable:** the Hub is designed to be provider-agnostic. Switch models by changing environment variables.

Environment variables:

| Variable                       | Default   | Notes                                         |
| ------------------------------ | --------- | --------------------------------------------- |
| `ENABLE_HUB`                   | `false`   | Feature flag — Hub is dormant until enabled    |
| `RUNWAYCTRL_HUB_PROVIDER`      | `openai`  | LLM provider identifier                       |
| `RUNWAYCTRL_HUB_MODEL`         | `gpt-5.2` | Model name                                    |
| `RUNWAYCTRL_HUB_API_KEY`       | —         | API key for LLM provider (stored in secrets)  |
| `RUNWAYCTRL_HUB_MIN_DATA_DAYS` | `7`       | Minimum days of data before Hub activates      |

### 8.5.3 Security stance

- The LLM **only** receives aggregated statistics from `execution_daily_stats` — never raw payloads, API keys, PII, tenant secrets, or individual attempt data.
- LLM responses are validated with Zod before persistence.
- Hub API key is stored in a secrets manager (never committed, never logged).
- Hub results are stored tenant-scoped with RLS enforcement.
- LLM provider endpoint must be allowlisted for egress.

### 8.5.4 Architecture rules

- Hub analysis is **async and pre-computed** — never on the request hot path.
- Hub is completely optional — the control plane functions identically without it.
- Hub activates only after `RUNWAYCTRL_HUB_MIN_DATA_DAYS` of meaningful data exist.
- See `Documentation/ADR-0012-hub-llm-analysis.md` for the full decision record.

---

## 9) Tooling (build, test, lint, format)

These are part of the stack because they enforce the contract.

- **Type checking/build:** `tsc`
- **Dev runner:** `tsx`
- **Tests:** `vitest`
- **Lint:** `eslint`
- **Format:** `prettier`
- **Multi-instance testing:** `testcontainers-node` — programmatic Docker management for spinning up multiple control-plane instances + shared Postgres in integration tests (Phase 8A)
- **Load/chaos harness:** `docker-compose.multi-instance.yml` — 3+ control-plane instances against one Postgres for CAS, lease, and governor correctness validation

Repository scripts live in the root `package.json`.

---

## 10) Local dev environment

Expected local dependencies:

- Docker / Docker Compose (Postgres; optional Redis)

Config:

- `.env` for local dev
- Production secrets must use a secrets manager (per `Documentation/Security Guidelines.md`)

---

## 11) CI/CD and release posture (v0.1)

CI must enforce:

- contract tests against OpenAPI
- dependency scanning
- lint + typecheck + tests

Release posture (design partner environments):

- migrations reviewed
- backups enabled
- retention jobs enabled
- rate limits enabled

---

## 12) Explicit non-goals / deferrals

To avoid accidental scope creep and security drift:

- Console UI is scaffolded only; it is not a v0.1 dependency.
- No event bus is required for v0.1.
- No multi-region active-active in v0.1.
- No payload capture by default.

---

## End of document
