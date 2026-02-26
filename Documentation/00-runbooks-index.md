# RunwayCtrl - Runbooks (v0.1)

| Field    | Value                                                                     |
| -------- | ------------------------------------------------------------------------- |
| Product  | RunwayCtrl                                                                |
| Doc Type | Runbooks                                                                  |
| Version  | v0.1                                                                      |
| Date     | January 21, 2026                                                          |
| Audience | On-call engineers + operators                                             |
| Goal     | Fast, safe incident response for retries + concurrency + partial failures |

---

## 0) TL;DR

If you only remember 3 things:

1. **ActionKey is intent**. Always pivot on `action_key` first.
2. **UNKNOWN is not failure**. It is ambiguity. Treat it like a live wire.
3. **Retries can kill you**. Prevent retry storms before they snowball.

---

## 1) On-call operating principles

- Prefer **containment** over heroics:
  - shed load, deny safely, open circuits, cap concurrency.
- Preserve the **ledger truth**:
  - do not mutate terminal states.
  - do not backfill with guesses.
- Avoid secrecy leaks in logs/traces:
  - never paste secrets into tickets.

---

## 2) Incident severity (v0.1)

| Sev  | Meaning                                           | Examples                              | Target response   |
| ---- | ------------------------------------------------- | ------------------------------------- | ----------------- |
| Sev0 | Tenant data exposure or irreversible side effects | cross-tenant leak, duplicate payments | immediate         |
| Sev1 | Major outage or high error rate                   | 5xx spike, DB down                    | minutes           |
| Sev2 | Partial degradation                               | latency, denial spikes                | < 30 min          |
| Sev3 | Minor issue                                       | dashboard glitch                      | next business day |

---

## 3) Golden correlation keys

Always collect these from a report:

- `tenant_id`
- `action_key`
- `attempt_id` (if known)
- `request_id` (X-Request-Id)
- `trace_id`

---

## 4) Where to look first (standard order)

1. **Control Plane Health** dashboard (requests, errors, latency)
2. **Governor Behavior** dashboard (decisions: PROCEED/PENDING/REPLAY/DENY)
3. **Tool Reliability** dashboard (rate limits, timeouts, unknown outcomes)
4. **Ledger Integrity** dashboard (stuck attempts, backlog)
5. **Ledger Insights** dashboard (cost efficiency, tool performance, retry waste trends)

---

## 5) Runbook list

### Core availability + latency

- RB-INC-001: API elevated 5xx / latency
- RB-INC-002: DB saturation / connection pool exhaustion
- RB-OPS-001: Deploy rollback

### Correctness under retries / partial failure

- RB-INC-003: Attempt UNKNOWN spike
- RB-INC-004: Ledger backlog / stuck IN_FLIGHT attempts
- RB-INC-005: Denial spike (budget/lease/circuit/rate-limit)
- RB-INC-006: Circuit stuck OPEN or flapping
- RB-INC-007: Lease contention / deadlock symptoms
- RB-INC-008: Duplicate side effects suspected (worst-case)

### Observability and tooling

- RB-INC-009: Missing traces/metrics/logs (OTel pipeline failure)
- RB-OPS-002: Backup/restore drill
- RB-OPS-003: Secret/key rotation

### Security

- RB-SEC-001: Auth failures / suspected key abuse
- RB-SEC-002: Suspected tenant boundary breach (Sev0)

### Load testing + correctness validation

- RB-OPS-004: Basic load test (Phase 8 gate requirement)
- RB-OPS-005: Write-heavy correctness harness (multi-instance + invariant validation)

---

## 6) Templates included

- `runbook-template.md` for adding new runbooks
- Query snippets (placeholders):
  - `runbooks-queries-01-ledger-sql-snippets.md`
  - `runbooks-queries-02-observability-queries.md`

---

## 7) Files in this export

- `00-runbooks-index.md` (this file)
- `runbook-template.md`
- `runbooks-queries-01-ledger-sql-snippets.md`
- `runbooks-queries-02-observability-queries.md`
- `RB-INC-001-api-5xx-latency.md`
- `RB-INC-002-db-saturation.md`
- `RB-INC-003-unknown-spike.md`
- `RB-INC-004-ledger-backlog.md`
- `RB-INC-005-denial-spike.md`
- `RB-INC-006-circuit-open-flap.md`
- `RB-INC-007-lease-contention.md`
- `RB-INC-008-duplicate-side-effects.md`
- `RB-INC-009-otel-pipeline-failure.md`
- `RB-OPS-001-deploy-rollback.md`
- `RB-OPS-002-backup-restore.md`
- `RB-OPS-003-key-rotation.md`
- `RB-SEC-001-auth-failures.md`
- `RB-SEC-002-tenant-breach.md`
- `RB-OPS-004-basic-load-test.md`
- `RB-OPS-005-write-heavy-load-harness.md`
