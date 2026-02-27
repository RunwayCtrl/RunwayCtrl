\

# RunwayCtrl — Product Requirements Document (PRD) (v0.1)

| Field            | Value                                            |
| ---------------- | ------------------------------------------------ |
| Product          | RunwayCtrl                                       |
| Doc Type         | PRD                                              |
| Version          | v0.1                                             |
| Date             | January 21, 2026                                 |
| Owner            | Frankl Labs (DBA: RunwayCtrl)                    |
| Primary Audience | Engineering, Product, Design, Early Dev Partners |
| Status           | Draft                                            |

---

## 1) Executive Summary

RunwayCtrl is an **agent execution control plane** that makes tool execution reliable in production by providing:

1. **Idempotent tool execution + Attempt Ledger** (hosted ledger)
2. **Retry governance / storm prevention** (budgets, backoff, circuiting)
3. **Concurrency governor** (leases/quotas/coalescing)
4. **OTel-native run observability** (traces/metrics/log correlation)

RunwayCtrl’s wedge is not “agent memory” or “prompting.” It’s the part that makes agents safe to run **at scale**, when they start doing real work against real systems.

**v0.1 data stance:** The ledger stores hashes/pointers/metadata by default (not raw tool request/response payloads). Opt-in payload capture, if added later, must be tenant-configurable and stored outside Postgres (see `Documentation/ADR-0009-payload-capture-stance.md`).

### 1.1 Systems of record (what owns truth)

RunwayCtrl is the **system of record for execution truth** — the durable facts about _what intent was declared_, _what attempts happened_, _what governance decisions were made_, and _what outcome pointer (if any) was produced_.

RunwayCtrl is **not** the system of record for the domain objects it touches (incidents, tickets, PRs). Those remain owned by their native systems.

| System                              | System of record for…                                                              | RunwayCtrl stores (v0.1)                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **RunwayCtrl Ledger**               | Action identity, attempt history, governance/lease decisions, and outcome pointers | `action_key`, `attempt_id`, states, timestamps, decision reasons, retry-after, outcome pointers (e.g., external IDs) |
| **GitHub** (v0.1 integration)       | Repos/PRs/issues/commits and their current state                                   | Pointers like `repo`, `issue_number`, `pr_number`, `sha` + minimal metadata                                          |
| **Jira** (v0.1 integration)         | Issues/tickets/comments and their lifecycle state                                  | Pointers like `issue_key`, `issue_id` + minimal metadata needed for replay/dedupe/audit                              |
| **ServiceNow** (v0.1 integration)   | Incidents/changes/CIs and their lifecycle state                                    | Pointers like `sys_id`, `number` (e.g., INC0042891) + minimal metadata                                               |
| **PagerDuty** (future nice-to-have) | Incidents, on-call/escalation state                                                | Pointers like `incident_id` + minimal metadata needed for replay/dedupe/audit                                        |

If there’s ever a mismatch: **the tool is authoritative for the tool object’s current state**, while **the ledger is authoritative for RunwayCtrl’s execution facts** (“we attempted X”, “we got UNKNOWN”, “we decided to JOIN”, “we saw external ID Y”).

---

## 2) Problem

### 2.1 What’s broken in the world

Agentic systems and automation stacks repeatedly hit the same reliability trap:

- **Partial failures**: the tool call might have succeeded, but the response got lost (timeouts, connection drops).
- **Retries become duplication**: retries can create duplicate side effects (double tickets, double payments, double page-outs).
- **Thundering herds**: one outage or rate limit triggers synchronized retries → retry storms → longer outages.
- **Unbounded concurrency**: parallel agents stampede the same resource (hot keys) and collapse the system.
- **Poor auditability**: teams can’t reconstruct “what happened” across agents/tools/runs when something goes wrong.
- **Observability gaps**: traces are disconnected from business actions; metrics are tool-centric, not execution-centric.

### 2.2 Why now

As apps embed agents “in the background,” tool execution volume becomes large, parallel, and failure-prone. The bottleneck shifts from “can we call an API?” to “can we coordinate thousands of tool calls safely?”

### 2.3 Customer pain signals

- Duplicate incidents/tickets created by retries
- Backlog growth from automation loops
- On-call fatigue due to self-inflicted retry storms
- Lack of forensics: “who created this?” “why did it happen twice?” “which agent did it?”

---

## 3) Target Users and Personas

### Persona A — Platform/Infra Engineer (Primary)

- Owns reliability, rate limits, concurrency, and observability.
- Wants guardrails that are measurable and enforceable.

### Persona B — Automation/Agent Engineer (Primary)

- Builds agents and tool wrappers.
- Wants simple SDK and predictable semantics: “call tools safely without thinking about distributed systems every day.”

### Persona C — SRE / On-call Lead (Secondary)

- Wants fewer incidents from automation.
- Wants blast-radius controls + post-incident forensics.

### Persona D — Security/Compliance (Secondary)

- Cares about data retention, PII, audit logs, access controls.

---

## 4) Product Goals and Non-Goals

### Goals (v0.1 → v1)

1. Prevent **duplicate business side effects** for tools that support idempotency, and reduce them substantially for tools that don’t.
2. Prevent and dampen **retry storms** via budgets, backoff, and circuiting.
3. Enforce **bounded concurrency** per tool and per resource.
4. Provide an **append-only attempt ledger** for auditability and replay.
5. Emit **OTel-native traces/metrics/logs** that link every tool attempt to every trace.6. Surface **LLM-powered execution intelligence** (The Hub) — async analysis of aggregated ledger data that detects patterns, flags anomalies, and recommends optimizations.

### Non-Goals (explicit)

- Not a workflow engine or orchestrator (we integrate with them).
- Not an agent planner, prompt manager, or memory store.
- Not a full secrets manager (we integrate with existing secret vaults).

---

## 5) Product Principles (hard constraints)

1. **Semantics-first**: execution semantics are the product, not just an API facade.
2. **Append-only truth**: the ledger is immutable history, not mutable “state.”
3. **Safe defaults**: conservative behavior out-of-the-box (budgets, backoff, leases).
4. **Dev-first**: fast local setup, clean SDK ergonomics, excellent docs.
5. **Vendor-neutral**: works across model providers, frameworks, and tool ecosystems.
6. **Boring reliability**: prefer proven patterns (leases, idempotency keys, backoff).

---

## 6) Core Use Cases (MVP)

### UC1 — “Create/Update ticket safely”

- Jira / ServiceNow / Linear: avoid duplicates on retries.
- Must dedupe based on ActionKey.

### UC2 — “Rate limit / 429 handling without storms”

- Tools return 429/retry-after.
- System must apply backoff budgets and avoid synchronized retries.

### UC3 — “Prevent concurrent writes to same resource”

- Many agents attempt to update the same ticket simultaneously.
- Must enforce ResourceKey lease and coalesce if needed.

### UC4 — “Forensics and audit”

- Operator asks: “What happened?” across run → action → attempts.
- Must answer quickly with ledger + trace correlation.

---

## 7) User Journeys (high level)

### Journey 1: Agent engineer adds safe tool calls

1. Install SDK
2. Wrap tool calls with `runway.tool.execute(...)`
3. Provide tool name, action name, and args
4. SDK derives ActionKey/ResourceKey (or user provides)
5. Execution is governed by RunwayCtrl

### Journey 2: On-call investigates incident

1. Search by trace_id or action_key
2. View action status and attempt history
3. Identify failure class (timeout/rate limit) and whether replay occurred
4. Confirm budgets/leases were applied

---

## 8) Requirements

### 8.1 Functional Requirements

#### FR1 — Action Identity & Dedupe

- Derive or accept **ActionKey** representing “same business intent.”
- If terminal outcome exists within dedupe window:
  - return prior success outcome pointer (or replayable terminal failure)
- Provide configurable dedupe windows per tool/action.

#### FR2 — Attempt Ledger (Append-only)

- Create an **Attempt** record for every execution try.
- Record Attempt events (created, lease acquired, tool sent, response, timeout, completed).
- Store:
  - request hash (not necessarily full payload)
  - outcome hash / pointer
  - timestamps, error classes, retries

#### FR3 — Retry Governance

- Apply retry budgets and jittered backoff.
- Enforce attempt caps per action.
- Enforce per-tool and per-resource budgets.
- Circuit breaker support (open/half-open/closed).

#### FR4 — Concurrency Governor

- Acquire leases on ResourceKey (TTL).
- Renew leases while in-flight.
- Policies: wait vs fail-fast; coalesce vs reject.

#### FR5 — Tool Idempotency Support

- When supported by tool:
  - attach idempotency key derived from ActionKey.
- When not supported:
  - support confirmation strategies (read-after-write; client tokens; compensations).

#### FR6 — Observability (OTel-first)

- Emit traces/spans for each attempt with required attributes:
  - action_key, attempt_id, tool, action, resource_key, outcome, retry_count, budgets, lease_state
- Export metrics:
  - attempts_total, retries_total, timeouts_total, rate_limits_total
  - budget_denials_total, lease_denials_total
  - p95/p99 latency by tool/action

#### FR7 — Multi-tenant + Auth

- Tenant isolation for ledger records.
- API keys (v0.1) with rotation support.
- RBAC can be minimal initially but must not block enterprise later.

#### FR8 — Ledger Insights (Execution Intelligence)

- Mine durable ledger data to surface cost optimization and operational intelligence.
- Provide read-only analytics endpoints (tenant-scoped, never on the write path):
  - Cost summary: retry waste ratio, replay savings, budget denial rate, unknown outcome rate.
  - Tool efficiency: per-tool success rate, average latency, retry cost, replay rate.
  - Retry waste: wasted attempts, denial breakdown (budget/lease/circuit), cost-per-successful-action.
  - Hotspots: top tools/actions by retry waste, contention, and unknown outcomes.
- Background aggregation worker computes daily stats from raw ledger data.
- Dashboard screen visualizes cost efficiency, tool performance, and trends.
- Rationale: durability is not just a safety net — it is a data asset that enables cost optimization.

#### FR9 — The Hub (LLM Execution Analysis)

- Async, server-side LLM analysis of aggregated execution data from `execution_daily_stats`.
- Default provider: OpenAI GPT-5.2 (provider-configurable via `RUNWAYCTRL_HUB_PROVIDER`, `RUNWAYCTRL_HUB_MODEL`).
- Runs daily after the aggregation worker; stores pre-computed insights in `hub_analyses` table.
- Serves results via `GET /v1/insights/hub` (tenant-scoped, read-only).
- Insight types: anomaly detection, optimization recommendations, pattern summaries, failure mode analysis.
- Each insight has: severity (info/warning/critical), title, summary, recommendation, supporting data points.
- LLM receives only aggregated statistics — never raw payloads, API keys, or PII.
- Responses validated with Zod before persistence.
- Gated by `ENABLE_HUB` feature flag; activates only after `RUNWAYCTRL_HUB_MIN_DATA_DAYS` of meaningful data.
- See `Documentation/ADR-0012-hub-llm-analysis.md`.

---

### 8.2 Non-Functional Requirements

- **Reliability**: control plane handles bursts and partial outages gracefully.
- **Latency**: minimal overhead on happy-path tool calls (target: low tens of ms).
- **Scalability**: support high parallelism (many concurrent attempts).
- **Durability**: ledger writes are durable; no silent loss of attempts.
- **Security**: encrypt at rest; TLS in transit; least-privilege.
- **Privacy**: minimize stored payload; prefer hashes/pointers.
- **Compliance readiness**: retention policies, audit exports.
- **Multi-instance correctness**: all guarantees (CAS, leases, governor, dedupe) must hold when multiple control-plane instances share the same Postgres. Validated by automated chaos tests (Phase 8A).
- **Analytics isolation**: insight queries read only from pre-aggregated tables; never contend with the hot write path.

---

## 9) MVP Scope (v0.1)

> **v0.1 Scope Lock:** The following is the complete scope. No additions.

### Included

- SDK (TypeScript first; Python in v0.2) wrapping tool calls
- Control Plane API:
  - begin action, complete attempt, mark unknown, query action status
  - lease acquire/renew (TTL-based)
  - **FIFO lease queueing** (fair ordering for contended resources)
- Ledger:
  - actions, attempts, attempt_events, **lease_waiters**
- Governor:
  - budgets, jittered backoff, attempt caps, circuit breakers
- OTel:
  - spans + baseline metrics
- **Minimal read-only dashboard:**
  - Actions list + detail
  - Attempts list + detail
  - Scoreboard (duplicates prevented, retries governed, leases active)
  - Insights screen (cost efficiency, tool performance, retry waste trends)
- **Ledger Insights API:**
  - `/v1/insights/cost-summary`, `/v1/insights/tool-efficiency`, `/v1/insights/retry-waste`, `/v1/insights/hotspots`
  - Background aggregation worker (`execution_daily_stats` table)
- **The Hub (LLM Execution Analysis):**
  - `GET /v1/insights/hub` — pre-computed LLM analysis of execution patterns
  - OpenAI GPT-5.2 (provider-configurable); runs daily after aggregation
  - Gated by `ENABLE_HUB` flag; dormant until sufficient data accumulates
  - See `Documentation/ADR-0012-hub-llm-analysis.md`
- **Multi-instance correctness validation:**
  - Chaos test harness (testcontainers-node, 3+ instances, shared Postgres)
  - CI-integrated multi-instance test suite
- **Production integrations:**
  - **GitHub** (8 actions: merge/create/close PR, issue ops, release, workflow)
  - **Jira** (8 actions: create issue, add comment, transition issue, create issue link, update fields, assign issue, bulk create, add attachment)
  - **ServiceNow** (10 actions: create incident, create change request, add work note, add comment, update state, assign incident, create CMDB CI, create problem, order service request, close/resolve)

### Excluded (explicit — v0.2+)

- Python SDK
- PagerDuty integration (demoted from v0.1 — native `incident_key`/`dedup_key` covers most dedupe value)
- Webhooks/callbacks (polling ok for v0.1)
- Full workflow orchestration
- Advanced RBAC/SSO
- Cross-region active-active
- Policy versioning/editing UI

---

## 10) API & SDK Surface (MVP)

### SDK (conceptual)

- `runway.beginAction({ tool, action, resourceKey?, args, actionKey? })`
- `runway.executeTool({ tool, action, resourceKey?, args, idempotencyMode })`
- `runway.completeAttempt({ attemptId, status, outcomePointer?, outcomeHash? })`
- `runway.markUnknown({ attemptId, reason })`
- `runway.getActionStatus({ actionKey })`

### Control Plane (conceptual endpoints)

- `POST /v1/actions/begin`
- `POST /v1/attempts/{attemptId}/complete`
- `POST /v1/attempts/{attemptId}/unknown`
- `GET  /v1/actions/{actionKey}`
- `POST /v1/leases/acquire`
- `POST /v1/leases/renew`

---

## 11) Data Model (MVP)

### Action

- `action_key` (PK), `tenant_id`
- `tool`, `action`, `resource_key`
- `created_at`, `updated_at`
- `terminal_status` (nullable)
- `terminal_outcome_pointer` (nullable)
- `dedupe_expires_at`

### Attempt

- `attempt_id` (PK), `tenant_id`
- `action_key` (FK)
- `status` (IN_FLIGHT/SUCCESS/FAILURE/UNKNOWN)
- `started_at`, `ended_at`
- `failure_class` (nullable)
- `request_hash`, `outcome_hash` (nullable)
- `trace_id` (optional but recommended)

### AttemptEvent

- `attempt_id`, `ts`
- `type` (CREATED/LEASE_GRANTED/TOOL_SENT/RESPONSE/UNKNOWN/COMPLETED/…)
- `details` (json)

### Lease

- `resource_key` (PK), `tenant_id`
- `holder_id`, `expires_at`, `version`

---

## 12) Success Metrics (what “winning” looks like)

### Adoption

- # of SDK installs, # of active tenants
- # of governed tool calls/day
- # of tools integrated (Jira, GitHub, ServiceNow, Slack, etc.)

### Reliability impact

- Duplicate side-effect rate (target: near-zero where idempotency exists)
- Retry storm incidents (target: significant reduction)
- Mean time to diagnose automation incidents (MTTD) reduced via ledger+OTel
- Multi-instance correctness: zero CAS/lease violations under concurrent chaos tests

### Performance

- Added latency per tool call (p50/p95)
- Governor decision latency (p95)

### Cost Intelligence

- Retry waste ratio trending down over time (insights drive governor tuning)
- Replay savings quantified (cost of actions not re-executed)
- Tool efficiency scores visible per tenant (actionable optimization signals)

### Hub Intelligence

- Hub adoption: % of tenants with Hub enabled and receiving insights
- Insight actionability: % of Hub recommendations that lead to governor tuning or config changes
- Anomaly detection accuracy: flagged patterns correlate with real degradations

---

## 13) Risks and Mitigations

### Risk: “Big platforms will bundle this”

- Mitigation: be **neutral** and integrate everywhere; win on operational excellence + semantics clarity.

### Risk: Tools without idempotency create edge cases

- Mitigation: confirmation patterns + client tokens + compensations; document per-tool modes.

### Risk: Storing payloads becomes privacy liability

- Mitigation: store hashes/pointers by default; allow opt-in payload capture per tenant (see `Documentation/ADR-0009-payload-capture-stance.md`).

### Risk: Governance becomes too opinionated

- Mitigation: policy config surfaces with safe defaults; provide escape hatches.

---

## 14) Open Questions / Decisions (tracked via ADRs, not in PRD)

This PRD assumes:

- Postgres-based ledger in v0.1 (simple + durable)
- TypeScript SDK first
- OTel is default observability layer

Decisions should be captured in `Documentation/adr-log.md` and `Documentation/ADR-*.md`.

---

## 15) Milestones (high-level)

### Milestone 0 — Skeleton (week 1–2)

- SDK scaffolding
- Control plane “begin/complete/unknown”
- Ledger tables + basic writes
- Basic OTel spans

### Milestone 1 — Dedupe + replay (week 3–4)

- ActionKey derivation + dedupe window
- Replay success outcomes
- Attempt event stream

### Milestone 2 — Leases + concurrency (week 5–6)

- Acquire/renew TTL leases
- Deny/wait policy
- Coalescing v0

### Milestone 3 — Governor v1 (week 7–8)

- budgets + backoff + attempt caps
- basic circuiting
- metrics

### Milestone 4 — Early design partners (continuous)

- 2–5 design partners integrating 1–2 tools each
- refine semantics and API ergonomics

---

## 16) Appendices

### A) Tradeoffs (explicit)

- “Strict exactly-once” vs “effectively-once”: we aim for **effectively-once** with tool idempotency + ledger replay.
- “Store payloads” vs “privacy”: default to hashes/pointers.
- “Wait” vs “fail fast” on leases: default to wait with bounded time, configurable per tool.

### B) Glossary expansion

- Idempotency: repeating the same request does not change the result after the first successful application.
- Retry storm: retries amplify failure, creating more load and longer outages.
- Lease: a time-bound lock to coordinate concurrency in distributed systems.
