\

# RunwayCtrl — OpenTelemetry Contract (v0.1)

| Field          | Value                                                 |
| -------------- | ----------------------------------------------------- |
| Product        | RunwayCtrl                                            |
| Doc Type       | OpenTelemetry Contract                                |
| Version        | v0.1                                                  |
| Date           | January 21, 2026                                      |
| Contract types | Span names, span attributes, metric names, log fields |
| Rule           | **Stable contract:** do not change names once shipped |

---

## 1) Resource attributes (MUST)

Every service MUST set these OTel Resource attributes:

| Key                      |  Required   | Example                    |
| ------------------------ | :---------: | -------------------------- |
| `service.name`           |     Yes     | `runwayctrl-api`           |
| `service.version`        |     Yes     | `0.1.0`                    |
| `deployment.environment` |     Yes     | `dev` / `staging` / `prod` |
| `telemetry.sdk.language` |     Yes     | `nodejs` / `python` / `go` |
| `cloud.region`           | Recommended | `us-west-2`                |
| `k8s.namespace.name`     | Recommended | `runwayctrl`               |

---

## 2) Context propagation (MUST)

- Use W3C Trace Context headers:
  - `traceparent`
  - `tracestate`
- For cross-service correlation, also propagate:
  - `baggage` (limited, non-sensitive)

**RunwayCtrl baggage keys (recommended)**

- `runwayctrl.tenant_id` (optional; careful with privacy)
- `runwayctrl.action_key`
- `runwayctrl.attempt_id`

---

## 3) Span naming (MUST)

General rule:

- Public HTTP server spans follow OTel HTTP semantic conventions.
- Internal spans use low-cardinality verb/object naming.

### 3.1 Root HTTP spans (server)

- `HTTP {method}` for high-level server span name (e.g., `HTTP POST`)
- Use `http.route` to identify route template (e.g., `/v1/actions/begin`)

Required attributes (server spans)

- `http.request.method`
- `http.route`
- `http.response.status_code`
- `url.scheme`
- `server.address`
- `client.address` (when known)

### 3.2 RunwayCtrl internal spans (child spans)

Prefix: `runwayctrl.`

Required internal span names:

- `runwayctrl.auth.verify_api_key`
- `runwayctrl.validate.request`
- `runwayctrl.actions.upsert_or_get`
- `runwayctrl.dedupe.check`
- `runwayctrl.governor.check_budget`
- `runwayctrl.governor.check_circuit`
- `runwayctrl.leases.acquire`
- `runwayctrl.attempts.create`
- `runwayctrl.attempts.complete`
- `runwayctrl.attempts.mark_unknown`
- `runwayctrl.actions.terminalize`
- `runwayctrl.events.append`
- `runwayctrl.db.query` (use OTel DB semconv when possible)

---

## 4) RunwayCtrl span attributes (custom, stable)

These are stable keys under the RunwayCtrl namespace. Prefer these for contracts.

| Attribute key               | Type   | Cardinality | Description                                          |
| --------------------------- | ------ | ----------- | ---------------------------------------------------- |
| `runwayctrl.tenant_id`      | string | High        | Tenant identifier                                    |
| `runwayctrl.request_id`     | string | High        | X-Request-Id                                         |
| `runwayctrl.action_key`     | string | High        | Idempotency/action key                               |
| `runwayctrl.attempt_id`     | string | High        | Attempt uuid                                         |
| `runwayctrl.tool`           | string | Medium      | Tool name (github/jira/servicenow/etc)               |
| `runwayctrl.action`         | string | Medium      | Tool action (create_issue/etc)                       |
| `runwayctrl.resource_key`   | string | High        | Optional lock/resource key                           |
| `runwayctrl.decision`       | string | Low         | PROCEED/PENDING/REPLAY_SUCCESS/REPLAY_FAILURE        |
| `runwayctrl.deny_reason`    | string | Low         | BUDGET_DENIED/LEASE_DENIED/CIRCUIT_OPEN/RATE_LIMITED |
| `runwayctrl.retry_after_ms` | int    | Low         | Server recommended retry wait                        |
| `runwayctrl.failure_class`  | string | Low         | TIMEOUT/RATE_LIMIT/etc                               |
| `runwayctrl.outcome`        | string | Low         | SUCCESS/FAILURE/UNKNOWN                              |

---

## 5) Endpoint → trace contract

### 5.1 `POST /v1/actions/begin`

Required child spans:

1. `runwayctrl.auth.verify_api_key`
2. `runwayctrl.validate.request`
3. `runwayctrl.actions.upsert_or_get`
4. `runwayctrl.dedupe.check`
5. `runwayctrl.governor.check_budget`
6. `runwayctrl.governor.check_circuit`
7. `runwayctrl.leases.acquire` (if resource_key present)
8. `runwayctrl.attempts.create` (only if decision=PROCEED)
9. `runwayctrl.events.append` (optional but recommended)

Required attributes on spans:

- include `runwayctrl.action_key`, `runwayctrl.tool`, `runwayctrl.action`
- include `runwayctrl.decision` on the span that determines the decision outcome
- if denied, include `runwayctrl.deny_reason` + `runwayctrl.retry_after_ms` (when present)

### 5.2 `POST /v1/attempts/{attempt_id}/complete`

Required child spans:

- `runwayctrl.attempts.complete`
- `runwayctrl.actions.terminalize` (if terminalizing)
- `runwayctrl.events.append` (optional)

### 5.3 `POST /v1/attempts/{attempt_id}/unknown`

Required child spans:

- `runwayctrl.attempts.mark_unknown`
- `runwayctrl.events.append` (optional)

### 5.4 `GET /v1/actions/{action_key}`

Required child spans:

- `runwayctrl.actions.get`
- `runwayctrl.attempts.list` (optional)

---

## 6) Metrics contract (names, types, units)

Metrics MUST:

- use monotonic counters for events
- use histograms for latency
- avoid high-cardinality label explosion

### 6.1 Core counters

- `runwayctrl.begin.total` (counter)
  - labels: `decision`, `tool`, `action`, `deny_reason` (when denied)
- `runwayctrl.attempts.created.total` (counter)
  - labels: `tool`, `action`
- `runwayctrl.attempts.completed.total` (counter)
  - labels: `tool`, `action`, `outcome`, `failure_class`
- `runwayctrl.attempts.unknown.total` (counter)
  - labels: `tool`, `action`, `unknown_reason`
- `runwayctrl.circuit.state_changes.total` (counter)
  - labels: `tool`, `action`, `from_state`, `to_state`

### 6.2 Core latency histograms

- `runwayctrl.http.server.duration` (histogram, seconds)
  - labels: `http.route`, `http.request.method`, `http.response.status_code`
- `runwayctrl.governor.decision.duration` (histogram, seconds)
  - labels: `tool`, `action`, `decision`
- `runwayctrl.tool.call.duration` (histogram, seconds) (SDK side)
  - labels: `tool`, `action`, `outcome`, `failure_class`

### 6.3 Gauges

- `runwayctrl.leases.active` (gauge)
  - labels: `tool`, `action` (avoid raw resource_key)
- `runwayctrl.circuit.open` (gauge)
  - labels: `tool`, `action`
- `runwayctrl.attempts.in_flight` (gauge)
  - labels: `tool`, `action`

### 6.4 Insights metrics (Phase 8B)

- `runwayctrl.insights.aggregation.duration_ms` (histogram)
  - labels: none (single worker)
  - Measures: wall-clock time of each daily aggregation run.
- `runwayctrl.insights.aggregation.rows_computed` (counter)
  - labels: none
  - Measures: total rows upserted into `execution_daily_stats` per run.
- `runwayctrl.insights.query.duration_ms` (histogram)
  - labels: `endpoint` (`cost_summary`, `tool_efficiency`, `retry_waste`, `hotspots`)
  - Measures: response time of each insights API query.

See `03-metrics-catalog.md` for a full registry.

---

## 7) Logs contract (structured)

Logs MUST be emitted as structured JSON with these fields:

| Field        |  Required   | Notes                     |
| ------------ | :---------: | ------------------------- |
| `timestamp`  |     Yes     | ISO-8601                  |
| `severity`   |     Yes     | DEBUG/INFO/WARN/ERROR     |
| `message`    |     Yes     | Human readable            |
| `request_id` |    Yes\*    | If in request context     |
| `tenant_id`  |    Yes\*    | If in tenant context      |
| `action_key` | Recommended | when applicable           |
| `attempt_id` | Recommended | when applicable           |
| `trace_id`   |    Yes\*    | If traced                 |
| `span_id`    |    Yes\*    | If traced                 |
| `error_code` | Recommended | stable error contract     |
| `details`    |  Optional   | structured, non-sensitive |

---

## 8) Stability rules (MUST)

- Do not rename metric names or span names once shipped.
- If contract must change:
  - introduce new names
  - keep old names for 1+ minor versions
  - document deprecations in release notes

---

## 9) Files in this export

- `Documentation/02-otel-contract.md` (this file)
