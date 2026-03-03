# Changelog

All notable changes to RunwayCtrl are documented in this file.

This project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Release entries are managed via Changesets.

## Phase 0 (v0.0.1-phase0)

### Added (Phase 0)

- Monorepo scaffolding with pnpm workspaces and shared TypeScript configuration.
- Local dev environment via Docker Compose (Postgres, plus optional Redis and an optional OTel Collector).
- Minimal, runnable control-plane dev server with a `/healthz` endpoint.
- Real `db:migrate` and `db:seed` scripts (Phase 0 seed is a canary; dev tenant/API key seed is deferred).

### Changed (Phase 0)

- CI baseline now runs formatting, lint, tests, and workspace build/typecheck, and applies DB migrations.
- Conventional Commits are enforced (local hook + CI gate for PR titles).

## 0.1.1

### Patch Changes

- Set up Changesets for versioning, changelog entries, and release automation.

## 0.1.0

### Added

- Project documentation (specs, ADRs, runbooks, guidelines)
- Repository scaffolding (README, LICENSE, CONTRIBUTING, SECURITY, CI)
- Apache 2.0 license
- GitHub Actions CI workflow
- Issue and PR templates

<!-- ## [0.1.0] - YYYY-MM-DD -->
<!-- ### Added -->
<!-- - Control Plane API (BeginAction, CompleteAttempt, MarkUnknown, GetAction) -->
<!-- - Durable Postgres ledger (actions, attempts, events, leases) -->
<!-- - Governor v1 (budgets, backoff, circuit-breaking) -->
<!-- - TypeScript SDK (sdk-core, sdk-node) -->
<!-- - Jira integration package -->
<!-- - ServiceNow integration package -->
<!-- - GitHub integration package -->
<!-- - Ledger Insights endpoints (cost-summary, tool-efficiency, retry-waste, hotspots) -->
<!-- - Interactive read-only dashboard with Integration Health panel -->
<!-- - OpenTelemetry instrumentation -->
<!-- - Multi-instance correctness tests -->
