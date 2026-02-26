# RunwayCtrl Documentation Alignment Report (v0.1)

Date: 2026-01-22

This document summarizes cross-doc consistency checks across `Documentation/` and flags the highest-impact drifts to resolve _before coding_.

## ✅ What’s consistently aligned

Across `RUNWAYCTRL_PROJECT_OVERVIEW.md`, `Flow Document.md`, `01-state-machines-and-invariants.md`, `Data Model Spec.md`, `Error Codes and Retry.md`, and `02-otel-contract.md`, the following core model is coherent:

- **ActionKey** is the idempotency surface (one Action per `(tenant_id, action_key)`), and attempts hang off that.
- **Unknown outcome** handling is central: callers must record UNKNOWN, then poll, then only re-attempt if not terminal.
- **Governance** is an explicit product feature: budgets, leases, and circuits exist to prevent retry storms and contention.
- **Postgres ledger is system-of-record**; Redis is optional and must never become “truth”.
- **OTel contract-first** observability and correlation is treated as a hard requirement.

## ✅ Resolved drifts (locked before coding)

### 1) OpenAPI is now the source of truth

We adopted **Option A**: OpenAPI is canonical in v0.1.

Files updated:

- `Documentation/openapi.yaml` now contains the v0.1 endpoints + schemas.
- `Documentation/API Contract.md` and `Documentation/Error Codes and Retry.md` reference the in-repo OpenAPI path.

Result: we’ve eliminated “source of truth” ambiguity.

### 2) BeginAction denials semantics

We aligned on: governance denials are HTTP 409/429/503 with `error_code` and optional `retry_after_ms`.

Files updated:

- `Documentation/ADR-0003-beginaction-decisions.md`
- `Documentation/openapi.yaml`

### 3) Observability namespace

We standardized on `runwayctrl.*` for telemetry attribute keys, span names, and metric names.

Files updated:

- `Documentation/Tech Stack.md`
- `Documentation/Security Guidelines.md`
- `Documentation/Flow Document.md`
- `Documentation/Backend Structure.md`

### 4) Documentation path drift

We updated key “export/reference” sections to reference the actual `Documentation/...` paths.

## 🧰 Web-grounded reliability notes (consistent with our specs)

These external references reinforce the direction already present in RunwayCtrl’s docs:

- **Retries:** exponential backoff + jitter prevents synchronized retry storms (“thundering herd”) and should be bounded.
- **Retry-After compliance:** when the server provides `retry_after_ms`, clients should not retry sooner.
- **Circuit breaker:** CLOSED/OPEN/HALF_OPEN is a standard pattern; HALF_OPEN prevents flooding a recovering dependency.
- **OTel propagation:** W3C `traceparent`/`tracestate` (and careful `baggage`) is the normal cross-service correlation mechanism.

Notes:

- Stripe’s API reference pages were blocked by CSP in our fetch tooling, but Stripe’s public blog post on idempotency was accessible and aligns with our approach.

## ✅ Proposed doc-change checklist

1. Resolve “OpenAPI source-of-truth” stance (pick A or B above).
2. Update ADR-0003 (DENY semantics) to match chosen BeginAction behavior.
3. Standardize OTel attribute namespace to `runwayctrl.*` across all docs.
4. Fix internal doc path references (`docs/...` vs `Documentation/...`).
5. (Optional) Add a short “Cardinality policy” note explicitly distinguishing:
   - High-cardinality OK for **traces/logs**, NOT OK for **metrics labels**.

---

If you want, I can apply a tight set of patches to:

- `API Contract.md`
- `Error Codes and Retry.md`
- `ADR-0003-beginaction-decisions.md`
- `Tech Stack.md`
- `Security Guidelines.md`
- `openapi.yaml`

…so the docs become self-consistent with minimal churn.
