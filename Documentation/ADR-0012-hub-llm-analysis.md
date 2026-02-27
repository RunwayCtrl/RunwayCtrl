# ADR-0012 — The Hub: LLM-powered execution analysis from ledger data

| Field  | Value                                                                |
| ------ | -------------------------------------------------------------------- |
| ADR ID | ADR-0012                                                             |
| Title  | The Hub: LLM-powered execution analysis from ledger data             |
| Status | ACCEPTED                                                             |
| Date   | February 27, 2026                                                    |
| Owners | Platform                                                             |
| Tags   | analytics, insights, llm, intelligence, hub                         |

---

## Context

RunwayCtrl already computes daily aggregated execution statistics from the durable ledger (Phase 8B: `execution_daily_stats`). The existing `/v1/insights/*` endpoints surface raw metrics — retry waste ratios, tool efficiency scores, hotspots, cost summaries. These numbers are valuable but require operators to manually interpret patterns, correlate spikes, and derive actionable recommendations.

For our target personas (Platform Engineers, SREs, Automation Engineers), the gap between "here are numbers" and "here's what's happening and what to do" is the difference between a dashboard they glance at and one they rely on.

## Decision

Add a feature called **"The Hub"** — an async, server-side, LLM-powered analysis layer that generates plain-English execution insights from pre-aggregated ledger statistics.

### Design principles:

1. **Async and pre-computed** — The LLM runs as part of the daily aggregation cron (after `execution_daily_stats` is populated). The analysis result is stored in a `hub_analyses` table and served as pre-computed JSON via `GET /v1/insights/hub`. Zero LLM calls in the request path.

2. **Provider-agnostic, default OpenAI** — The LLM provider is configurable via environment variables. v0.1 ships with OpenAI GPT-5.2 as the default. Swapping providers is a config change, not a code change.

3. **Deterministic governance is unchanged** — The Hub is advisory only. It never influences runtime decisions (begin/replay/deny/lease). All governance remains deterministic, CAS-enforced, and auditable. The Hub explains patterns after the fact.

4. **Graceful degradation** — If the LLM provider is unavailable, unconfigured, or the feature flag is disabled, the Hub endpoint returns an empty analysis. All other insights, scoreboard, and action data are completely unaffected.

5. **Minimum data threshold** — The Hub is dormant until there is meaningful data to analyze (configurable, default 7 days of aggregated stats). This prevents useless insights on fresh tenants.

6. **Security: aggregates only** — The LLM prompt contains only aggregated numerical data from `execution_daily_stats` (counts, rates, percentages, tool names, action names). It never receives raw payloads, API keys, PII, resource keys with customer identifiers, or any secret material.

## Options considered

1. **No LLM analysis — raw metrics only** — Leaves interpretation burden on operators. Misses the "what does this mean?" value.
2. **Real-time LLM on each request** — Adds 200ms–2000ms latency to every insight query. Expensive at scale. Rejected.
3. **LLM in the SDK making governance decisions** — Destroys determinism, adds latency to hot path, creates security risk (prompt injection on governance). Firmly rejected.
4. **Async daily LLM analysis, pre-computed and stored** [CHOSEN] — Low cost (1 call/tenant/day), no hot-path impact, graceful degradation, auditable.

## Tradeoffs

### Pros

- Transforms raw metrics into actionable, plain-English recommendations
- Negligible cost (~$0.01/tenant/day at daily cadence)
- Zero impact on governance correctness or hot-path latency
- Provider-agnostic — can swap models without code changes
- Pre-computed — dashboard reads are <10ms
- Auditable — every analysis is stored with timestamp and source data reference

### Cons

- Adds an external dependency (LLM provider) — mitigated by graceful degradation
- LLM output quality varies — mitigated by Zod schema validation on responses
- Adds a table and a background job — marginal complexity
- Analysis is only as fresh as the last aggregation run (daily lag)

## Consequences

- New table: `hub_analyses` (tenant-scoped, append-only analysis records)
- New endpoint: `GET /v1/insights/hub` (tenant-scoped, read-only)
- New background job step: Hub analysis runs after the daily aggregation worker
- New environment variables: `RUNWAYCTRL_HUB_PROVIDER`, `RUNWAYCTRL_HUB_MODEL`, `RUNWAYCTRL_HUB_API_KEY`, `RUNWAYCTRL_HUB_MIN_DATA_DAYS`
- New feature flag: `ENABLE_HUB` (default: true when API key is configured)
- New OTel metrics: `runwayctrl.hub.analysis.duration_ms`, `runwayctrl.hub.analysis.insights_generated`, `runwayctrl.hub.query.duration_ms`
- Dashboard: new "RunwayCtrl Hub" panel on the Insights screen (read-only)
- Security: LLM prompt construction must be reviewed — only aggregated stats, never secrets/PII

## How we will validate

- Hub endpoint returns valid, Zod-validated JSON with severity/title/summary/recommendation/data_points
- Hub analysis is tenant-scoped (multi-tenant isolation holds)
- When LLM is unconfigured or down, Hub endpoint returns `{ "insights": [], "status": "unavailable" }` — no cascading failure
- Dashboard renders Hub insights correctly in the read-only panel
- OTel metrics are emitted for analysis duration and query latency
- Minimum data threshold prevents meaningless insights on fresh tenants

## References

- ADR-0010 (Ledger Insights: analytics + cost optimization)
- PRD Section FR8 (Ledger Insights) and FR9 (Hub)
- Implementation Plan Phase 8B
- Frontend Guidelines Section 4.6 (Insights screen)
- Security Guidelines Section 7.4 (Hub security)
- OTel Contract Section 6.4 (Insights + Hub metrics)
