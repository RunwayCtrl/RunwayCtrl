# ADR-0010: Ledger Insights — Analytics + Cost Optimization from Durable Data

| Field   | Value                        |
| ------- | ---------------------------- |
| Status  | Accepted                     |
| Date    | 2026-01-21                   |
| Context | Phase 8B planning            |
| Relates | ADR-0002, ADR-0004, ADR-0009 |

---

## Context

RunwayCtrl's durable ledger (actions, attempts, attempt_events) captures every execution fact: what was attempted, what the governor decided, what succeeded, failed, or remained unknown. This data currently exists only for correctness and auditability.

The article "7 Failure Modes When AI Agents Move from Demo to Production" identifies a key insight: **durable state is not just a safety net — it is a data asset**. Systems that capture execution history can mine it for cost optimization, pattern detection, and operational intelligence. This turns durability from a cost center (storage) into a competitive advantage.

## Decision

We will add a **read-only analytics layer** (Ledger Insights) that extracts value from the durable ledger without affecting the write path.

### Design Principles

1. **Read-only and isolated:** Insight queries never touch the hot write path. All reads come from a pre-aggregated `execution_daily_stats` table.
2. **Background aggregation:** A scheduled worker computes daily statistics by querying raw ledger data during off-peak hours. Aggregation is idempotent (UPSERT).
3. **Tenant-scoped:** All analytics are per-tenant. Same auth model as all other endpoints.
4. **Safe degradation:** If the aggregation worker fails, stale data persists. Insights are never authoritative for correctness — they are informational.
5. **Additive only:** No changes to the existing ledger schema or write paths. The analytics table is a new, independent table.

### New Table: `execution_daily_stats`

Pre-aggregated daily stats per `(tenant_id, stat_date, tool, action)` with columns for:

- Volume: total actions, attempts, successes, failures, unknowns, replays
- Latency: avg and p95 attempt duration
- Waste: retry waste (excess attempts), budget denials, lease denials, circuit opens

### New Endpoints (all `GET`, all tenant-scoped)

- `/v1/insights/cost-summary` — Aggregate cost/efficiency metrics
- `/v1/insights/tool-efficiency` — Per-tool breakdown
- `/v1/insights/retry-waste` — Wasted attempts and denial analysis
- `/v1/insights/hotspots` — Top tools/actions by waste and contention

### New Module

- `apps/control-plane/src/analytics/` — aggregation worker, queries, service

## Alternatives Considered

1. **Real-time analytics from raw tables:** Rejected. Querying `actions` + `attempts` at read time would contend with the write path and degrade under load.
2. **External analytics pipeline (e.g., Kafka → ClickHouse):** Rejected for v0.1. Too much infra complexity. The daily aggregation approach covers the 80% use case with zero new infrastructure.
3. **Materialized views:** Considered. Postgres materialized views would work but lack the control and idempotency of an explicit UPSERT worker. May revisit in v0.2.
4. **No analytics (keep ledger for correctness only):** Rejected. Missing the competitive advantage of mining execution data for cost optimization.

## Consequences

- **Positive:** Unique differentiator — customers see cost savings, tool efficiency, and optimization signals from their execution history.
- **Positive:** Low risk — read-only, additive, no changes to the correctness path.
- **Negative:** Additional table and background worker to maintain.
- **Negative:** Analytics are delayed (daily aggregation), not real-time. Acceptable for v0.1.

## References

- [Implementation Plan Phase 8B](Implementation%20Plan.md)
- [Data Model Spec Section 5.9](Data%20Model%20Spec.md)
- [Backend Structure Section 4.8](Backend%20Structure.md)
- [Observability Spec D5, A6](01-observability-spec.md)
- [OTel Contract Section 6.4](02-otel-contract.md)
