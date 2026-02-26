\

# RunwayCtrl — Observability Spec (v0.1)

| Field    | Value                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| Product  | RunwayCtrl                                                                          |
| Doc Type | Observability Spec                                                                  |
| Version  | v0.1                                                                                |
| Date     | January 21, 2026                                                                    |
| Standard | OpenTelemetry (OTel)                                                                |
| Signals  | Traces, Metrics, Logs                                                               |
| Goal     | Make agent execution _debuggable, governable, and safe_ under retries + concurrency |

---

## 1) Goals (what “good” looks like)

### G1 — Every user-visible action is explainable

Given `action_key`, we can answer:

- what happened?
- why did it happen? (decision path)
- where did time go? (latency breakdown)
- did we duplicate side-effects? (attempt ledger evidence)

### G2 — Fast incident isolation

Given a spike (rate limits, retries, errors), we can isolate:

- tenant(s)
- tool/action pairs
- which governor (budget/lease/circuit) is applying
- whether it’s our bug vs downstream degradation

### G3 — Predictable SLOs

We can define and enforce service-level objectives around:

- BeginAction decision latency
- action completion latency (end-to-end)
- denial rates and unknown-outcome rates
- retry storms (leading indicator)

---

## 2) Scope and components

**Services (example `service.name`)**

- `runwayctrl-api` — HTTP Control Plane API
- `runwayctrl-governor` — decision engine (often co-located with API)
- `runwayctrl-ledger-worker` — async reconciliation / janitor
- `runwayctrl-sdk` — client-side tracing + retry orchestration

**Core entities to correlate**

- `tenant_id`
- `request_id` (X-Request-Id)
- `action_key`
- `attempt_id`
- `trace_id` / `span_id`

---

## 3) Correlation contract (MUST)

### 3.1 Request correlation

- Server MUST emit `X-Request-Id` on every response.
- SDK MUST attach `X-Request-Id` to logs for each HTTP call.
- All log lines MUST include `request_id` when available.

### 3.2 Trace correlation (OTel)

- Use W3C Trace Context (`traceparent` / `tracestate`) end-to-end.
- Logs MUST include `trace_id` and `span_id` when in a traced context.
- SDK MUST propagate trace context across retries and polling loops.

### 3.3 Action correlation

Every span and log emitted _during_ an action lifecycle SHOULD include:

- `runwayctrl.action_key`
- `runwayctrl.attempt_id` (if applicable)
- `runwayctrl.tool`, `runwayctrl.action`

---

## 4) Data classification + redaction (MUST)

### 4.1 Never store secrets

Do NOT record:

- API keys
- OAuth tokens
- raw tool payloads containing secrets
- raw SQL, stack traces with secrets

### 4.2 Tool payload policy

Default policy: store **hashes and pointers** only.

- store: `args_hash`, `outcome_hash`, `outcome_pointer`
- avoid: full request/response bodies (unless explicit tenant opt-in)

### 4.3 Tenant identifiers in metrics

- `tenant_id` is **high cardinality**.
- Metrics exported to a shared backend MUST NOT label on raw `tenant_id` by default.
- If tenant dimension is required, use either:
  - per-tenant metric pipelines, or
  - hashed/partitioned bucket (e.g., `tenant_bucket=0..1023`).

Traces/logs MAY include raw `tenant_id` (access controlled).

---

## 5) Signal standards (what we emit)

### 5.1 Traces (distributed)

Traces are the **primary debugging tool** for:

- decision paths (PROCEED / PENDING / REPLAY / DENY)
- governor latency breakdown
- tool-call latency, timeouts, and unknown outcomes

### 5.2 Metrics (time series)

Metrics are for:

- SLOs and alerting
- capacity and saturation
- rate limiting, denial rates, retry storm detection

### 5.3 Logs (structured)

Logs are for:

- high-fidelity forensic detail
- searchable narratives around `action_key` and `attempt_id`
- error context (without secrets)

---

## 6) Required dashboards (v0.1)

### D1 — Control Plane Health

Panels:

- request rate / error rate by endpoint
- p50/p95/p99 latency by endpoint
- saturation: concurrency, CPU, DB pool, queue depth
- denial rates by type (budget/lease/circuit/rate limit)

### D2 — Governor Behavior

Panels:

- BeginAction decisions over time (PROCEED/PENDING/REPLAY/DENY)
- retry-after distribution
- join-window hit rate (how often we coalesce)
- circuit open count and duration

### D3 — Tool Reliability

Panels (by tool/action):

- downstream latency histograms
- downstream failure classes
- unknown-outcome rate
- retry count distribution

### D4 — Ledger Integrity

Panels:

- attempts created vs attempts completed
- attempts stuck IN_FLIGHT for >X minutes
- UNKNOWN attempts unresolved
- action terminalization rate

### D5 — Ledger Insights (Execution Intelligence)

Panels:

- **Cost Efficiency:** retry waste ratio (total_retry_waste / total_attempts), replay savings (replay_hits), budget denial rate, unknown outcome rate
- **Tool Performance:** per-tool success rate, average latency (from `execution_daily_stats`), retry cost per tool
- **Hotspots:** top 10 tools/actions by retry waste, lease contention, and unknown outcomes
- **Trends:** daily action volume sparkline, retry waste trend, unknown outcome trend (7d/30d/90d)
- **Aggregation Health:** last aggregation timestamp, duration, rows computed

Data source: `execution_daily_stats` table (pre-aggregated by background worker, never querying hot write path).

---

## 7) Alerting (v0.1)

### A1 — Control Plane SLO breach (page)

- `runwayctrl.http.server.duration` p99 > threshold for 5+ minutes (by route)

### A2 — Denial anomaly (page)

- `runwayctrl.begin.denied.total` spikes above baseline (budget/lease/circuit)

### A3 — Unknown-outcome spike (page)

- `runwayctrl.attempts.unknown.total` rate exceeds threshold

### A4 — Circuit stuck OPEN (page)

- circuit OPEN > N minutes for critical tool/action

### A5 — Ledger backlog (page)

- “in-flight attempts older than X” rises quickly

### A6 — Insights worker stale (warn)

- Insights aggregation worker has not completed successfully in > 36 hours.
- Metric: check `runwayctrl.insights.aggregation.rows_computed` counter for staleness or `computed_at` recency in `execution_daily_stats`.

---

## 8) Sampling strategy (recommended)

### 8.1 Traces

A practical v0.1 sampling policy:

- 100% sample for:
  - errors (5xx, INTERNAL_ERROR)
  - DENY decisions (budget/lease/circuit)
  - UNKNOWN outcomes
  - p99 latency outliers
- 1–5% baseline sample for normal requests

Prefer tail-based sampling in the collector for precision.

### 8.2 Logs

- Always log errors.
- For normal operations, log at INFO with compact structured fields.
- For debug, enable tenant-scoped debug mode (never global).

---

## 9) Instrumentation plan (what to instrument first)

### Phase 1 (must-have)

- API server spans for:
  - `POST /v1/actions/begin`
  - attempt completion / unknown marking
  - action status polling
- Governor spans:
  - dedupe lookup
  - lease acquire/deny
  - budget check/deny
  - circuit check/deny
- Metrics:
  - decision counts
  - request duration
  - attempt lifecycle counts
- Structured logs with trace correlation

### Phase 2 (nice-to-have)

- DB spans with semantic conventions
- async worker spans
- queue / job metrics
- per-tenant debug dashboards

### Phase 3 (Ledger Insights)

- Insights aggregation worker spans:
  - `insights.aggregate` (wraps each aggregation run)
- Insights API query spans:
  - `insights.query.cost_summary`, `insights.query.tool_efficiency`, `insights.query.retry_waste`, `insights.query.hotspots`
- Metrics:
  - `runwayctrl.insights.aggregation.duration_ms` (histogram)
  - `runwayctrl.insights.aggregation.rows_computed` (counter)
  - `runwayctrl.insights.query.duration_ms` (histogram, per endpoint)
- Logs:
  - `insights.aggregation.started` / `insights.aggregation.completed`
  - `insights.aggregation.failed` (with error details)

---

## 10) Files in this export

- `01-observability-spec.md` (this file)
- `02-otel-contract.md` (span/metric/log contract)
- `03-metrics-catalog.md` (metric registry)
- `attributes.yaml` (required + optional attributes)
- `otel-collector.example.yaml` (collector baseline)
