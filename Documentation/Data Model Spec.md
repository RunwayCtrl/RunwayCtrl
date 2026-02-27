# RunwayCtrl — Data Model Spec (ERD + Tables + Constraints) (v0.1)

| Field    | Value                                                   |
| -------- | ------------------------------------------------------- |
| Product  | RunwayCtrl                                              |
| Doc Type | Data Model Spec (ERD + table definitions + constraints) |
| Version  | v0.1                                                    |
| Date     | January 21, 2026                                        |
| Database | Postgres (system of record)                             |
| Scope    | Control Plane Ledger + Governor config/state            |

---

## 1) Purpose

This document pins down the **database truth** for RunwayCtrl so implementation is deterministic:

- tables + columns + types
- primary keys + foreign keys + unique constraints
- indexes
- invariants (what must never be violated)
- operational notes (retention, cleanup, partitioning)

This spec is designed to be “feedable” into VSCode and used as the blueprint for migrations.

---

## 2) Principles (v0.1)

### 2.1 Multi-tenant isolation is non-negotiable

Every tenant-scoped table MUST include `tenant_id`, and all keys MUST be scoped by it.

**Defense-in-depth recommendation:** enable Postgres **Row Level Security (RLS)** with a `current_setting('app.tenant_id')` pattern, even if the app layer already scopes queries. (RLS is optional in v0.1, but recommended.)

### 2.2 The ledger is append-first

Attempts and attempt events are the audit spine. Updates happen, but:

- **terminal states are immutable**
- state transitions must be validated

### 2.3 Minimize sensitive storage

By default, store:

- hashes (`args_hash`, `outcome_hash`)
- pointers (`outcome_pointer`)
  Avoid storing raw tool payloads unless tenant explicitly opts in.

---

## 3) ERD

> Mermaid source is also included as `Documentation/02-erd.mmd`.

```mermaid
erDiagram
  TENANTS ||--o{ API_KEYS : has
  TENANTS ||--o{ ACTIONS : owns
  TENANTS ||--o{ ATTEMPTS : owns
  TENANTS ||--o{ ATTEMPT_EVENTS : owns
  TENANTS ||--o{ LEASES : owns
  TENANTS ||--o{ LEASE_WAITERS : owns
  TENANTS ||--o{ GOVERNOR_POLICIES : configures
  TENANTS ||--o{ CIRCUITS : tracks
  TENANTS ||--o{ EXECUTION_DAILY_STATS : aggregates
  TENANTS ||--o{ HUB_ANALYSES : generates

  ACTIONS ||--o{ ATTEMPTS : spawns
  ATTEMPTS ||--o{ ATTEMPT_EVENTS : emits
  LEASES ||--o{ LEASE_WAITERS : queues

  TENANTS {
    text tenant_id PK
    text name
    text status
    timestamptz created_at
    timestamptz updated_at
  }

  API_KEYS {
    text api_key_id PK
    text tenant_id FK
    text name
    text key_hash UNIQUE
    timestamptz created_at
    timestamptz revoked_at
  }

  ACTIONS {
    text tenant_id PK
    text action_key PK
    text tool
    text action
    text resource_key
    text args_hash
    text status
    uuid terminal_attempt_id
    text outcome_pointer
    text failure_class
    int attempt_count
    timestamptz created_at
    timestamptz updated_at
  }

  ATTEMPTS {
    text tenant_id PK
    uuid attempt_id PK
    text action_key FK
    text status
    text failure_class
    text unknown_reason
    text outcome_hash
    text outcome_pointer
    int tool_http_status
    text tool_request_id
    int latency_ms
    text trace_id
    jsonb rate_limit_headers
    timestamptz started_at
    timestamptz updated_at
    timestamptz completed_at
  }

  ATTEMPT_EVENTS {
    text tenant_id PK
    uuid event_id PK
    uuid attempt_id FK
    text action_key
    timestamptz ts
    text event_type
    text request_id
    jsonb payload
  }

  LEASES {
    text tenant_id PK
    text resource_key PK
    text holder_id
    timestamptz expires_at
    timestamptz created_at
    timestamptz updated_at
  }

  LEASE_WAITERS {
    uuid waiter_id PK
    text tenant_id PK
    text resource_key FK
    uuid attempt_id FK
    text action_key
    timestamptz queued_at
    timestamptz expires_at
    text status
    timestamptz notified_at
    timestamptz created_at
    timestamptz updated_at
  }

  GOVERNOR_POLICIES {
    text tenant_id PK
    text policy_id PK
    text tool
    text action
    text resource_key_prefix
    int max_concurrency
    int qps
    int burst
    int max_attempts
    int base_backoff_ms
    int max_backoff_ms
    int dedupe_window_ms
    int join_window_ms
    timestamptz created_at
    timestamptz updated_at
  }

  CIRCUITS {
    text tenant_id PK
    text circuit_key PK
    text tool
    text action
    text state
    int failure_count
    timestamptz opened_at
    timestamptz next_probe_at
    timestamptz updated_at
  }

  EXECUTION_DAILY_STATS {
    text tenant_id PK
    date stat_date PK
    text tool PK
    text action PK
    int total_actions
    int total_attempts
    int successful_actions
    int failed_actions
    int unknown_outcomes
    int replay_hits
    int avg_latency_ms
    int p95_latency_ms
    int total_retry_waste
    int budget_denials
    int lease_denials
    int circuit_opens
    timestamptz computed_at
  }

  HUB_ANALYSES {
    text tenant_id PK
    uuid analysis_id PK
    date analysis_date
    jsonb insights
    text model_provider
    text model_name
    jsonb input_summary
    timestamptz generated_at
    timestamptz created_at
  }

```

---

## 4) Types / enums (recommended)

**Option A (recommended): Postgres enums**

- `attempt_status`: IN_FLIGHT | SUCCESS | FAILURE | UNKNOWN
- `action_status`: IN_FLIGHT | SUCCESS | FAILURE | UNKNOWN
- `failure_class`: RATE_LIMIT | TIMEOUT | AUTH | VALIDATION | SERVER_ERROR | BUDGET_DENIED | LEASE_DENIED | CIRCUIT_OPEN | UNKNOWN
- `circuit_state`: CLOSED | OPEN | HALF_OPEN

**Option B: TEXT + CHECK constraints**
Works fine for v0.1 and keeps migrations simpler.

This spec assumes **TEXT + CHECK** for v0.1.

---

## 5) Table definitions

### 5.1 `tenants`

**Purpose:** tenant registry (used for auth scoping + config).

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| tenant*id | text | No | — | Primary identifier (`tnt*...`) |
| name | text | No | — | Display name |
| status | text | No | 'ACTIVE' | ACTIVE / SUSPENDED (CHECK) |
| created_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |

**Constraints**

- PK: `(tenant_id)`
- CHECK: `status IN ('ACTIVE','SUSPENDED')`

**Indexes**

- `tenants(status)`

---

### 5.2 `api_keys`

**Purpose:** tenant-scoped API keys (store hash only).

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| api_key_id | text | No | — | Primary identifier |
| tenant_id | text | No | — | FK → tenants |
| name | text | No | — | Key label |
| key_hash | text | No | — | UNIQUE per tenant (store hashed) |
| created_at | timestamptz | No | now() | |
| revoked_at | timestamptz | Yes | null | Null = active |

**Constraints**

- PK: `(api_key_id)`
- FK: `(tenant_id) REFERENCES tenants(tenant_id)`
- UNIQUE: `(tenant_id, key_hash)`

**Indexes**

- `api_keys(tenant_id)`
- Partial index for active keys:
  - `api_keys(tenant_id) WHERE revoked_at IS NULL`

---

### 5.3 `actions`

**Purpose:** one row per semantic action (idempotency surface).

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| tenant_id | text | No | — | Tenant scope |
| action_key | text | No | — | Idempotency key (stable) |
| tool | text | No | — | e.g., jira/github |
| action | text | No | — | e.g., create_issue |
| resource_key | text | Yes | null | Optional serialized resource |
| args_hash | text | No | — | Hash of canonical args |
| status | text | No | 'IN_FLIGHT' | IN_FLIGHT/SUCCESS/FAILURE/UNKNOWN |
| terminal_attempt_id | uuid | Yes | null | Set when terminal |
| outcome_pointer | text | Yes | null | Pointer to outcome material |
| failure_class | text | Yes | null | If terminal failure |
| attempt_count | int | No | 0 | Denormalized for quick reads |
| created_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |

**Constraints**

- PK: `(tenant_id, action_key)`
- FK (optional but recommended):
  - `(tenant_id) REFERENCES tenants(tenant_id)`
- CHECK: `status IN ('IN_FLIGHT','SUCCESS','FAILURE','UNKNOWN')`
- CHECK: `attempt_count >= 0`

**Invariants**

- If `status IN ('SUCCESS','FAILURE')` then `terminal_attempt_id IS NOT NULL`.
- If `status='SUCCESS'` then `outcome_pointer IS NOT NULL`.
- If `status='FAILURE'` then `failure_class IS NOT NULL`.

> In Postgres, enforce these with CHECK constraints and/or triggers (because `terminal_attempt_id` may reference an attempt row).

**Indexes**

- `actions(tenant_id, updated_at DESC)`
- `actions(tenant_id, status, updated_at DESC)`
- `actions(tenant_id, tool, action, created_at DESC)`
- Optional: `actions(tenant_id, resource_key)` (if leases/resource replay is common)

---

### 5.4 `attempts`

**Purpose:** execution attempts ledger (core audit spine).

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| tenant_id | text | No | — | Tenant scope |
| attempt_id | uuid | No | gen_random_uuid() | Primary attempt id |
| action_key | text | No | — | FK to actions within tenant |
| status | text | No | 'IN_FLIGHT' | IN_FLIGHT/SUCCESS/FAILURE/UNKNOWN |
| failure_class | text | Yes | null | On failure/denial |
| unknown_reason | text | Yes | null | TIMEOUT/NETWORK/UNKNOWN |
| outcome_hash | text | Yes | null | Hash of outcome |
| outcome_pointer | text | Yes | null | Pointer to outcome |
| tool_http_status | int | Yes | null | Underlying tool HTTP status |
| tool_request_id | text | Yes | null | Tool correlation id |
| latency_ms | int | Yes | null | Tool call latency |
| trace_id | text | Yes | null | OTel trace id |
| rate_limit_headers | jsonb | Yes | null | Captured rate limit headers from tool response (provider-specific: Jira points-based pools, ServiceNow shared pool, GitHub standard headers). Used by Integration Health dashboard. |
| started_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |
| completed_at | timestamptz | Yes | null | Set on terminalization |

**Constraints**

- PK: `(tenant_id, attempt_id)`
- FK: `(tenant_id, action_key) REFERENCES actions(tenant_id, action_key)`
- CHECK: `status IN ('IN_FLIGHT','SUCCESS','FAILURE','UNKNOWN')`
- CHECK: `(latency_ms IS NULL OR latency_ms >= 0)`

**State-transition invariants**

- Terminal states are immutable:
  - if `status IN ('SUCCESS','FAILURE')`, future writes MUST NOT change `status`
- UNKNOWN may transition to terminal (SUCCESS/FAILURE) by reconciliation, but never back to IN_FLIGHT.

> Enforce immutability with either:
>
> - application-level “compare-and-swap” updates using `WHERE status IN (...)`
> - or DB triggers that reject illegal transitions.

**Indexes**

- `attempts(tenant_id, action_key, started_at DESC)`
- `attempts(tenant_id, status, updated_at DESC)`
- `attempts(tenant_id, completed_at DESC) WHERE completed_at IS NOT NULL`

---

### 5.5 `attempt_events`

**Purpose:** append-only event stream for audit/debug (optional but strongly recommended).

Events include:

- BEGIN_DECISION
- TOOL_CALL_STARTED
- TOOL_CALL_COMPLETED
- MARKED_UNKNOWN
- GOVERNOR_DENIED
- LEASE_GRANTED / LEASE_DENIED
- ACTION_TERMINALIZED

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| tenant_id | text | No | — | Tenant scope |
| event_id | uuid | No | gen_random_uuid() | Unique event id |
| attempt_id | uuid | No | — | FK to attempts |
| action_key | text | No | — | Redundant for convenience |
| ts | timestamptz | No | now() | Event timestamp |
| event_type | text | No | — | CHECK on known types |
| request_id | text | Yes | null | X-Request-Id correlation |
| payload | jsonb | Yes | null | Non-sensitive structured payload |

**Constraints**

- PK: `(tenant_id, event_id)`
- FK: `(tenant_id, attempt_id) REFERENCES attempts(tenant_id, attempt_id)`
- CHECK: `event_type IN (...)` (define the list)

**Indexes**

- `attempt_events(tenant_id, attempt_id, ts ASC)`
- `attempt_events(tenant_id, action_key, ts DESC)`
- Optional: GIN index on payload for ops queries:
  - `attempt_events USING gin (payload)`

**Retention**

- Default retention 30–90 days (configurable per tenant).
- Consider partitioning by month once volume grows.

---

### 5.6 `leases`

**Purpose:** tenant-scoped TTL locks to serialize access to a resource.

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| tenant_id | text | No | — | Tenant scope |
| resource_key | text | No | — | Lock key (e.g., jira:issue:ABC-123) |
| holder_id | text | No | — | attempt_id or instance id |
| expires_at | timestamptz | No | — | TTL boundary |
| created_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |

**Constraints**

- PK: `(tenant_id, resource_key)`
- CHECK: `expires_at > created_at`

**Indexes**

- `leases(tenant_id, expires_at)` (for cleanup)
- Optional: `leases(tenant_id, holder_id)`

**Acquisition semantics**

- Acquire must be done via an atomic upsert with `WHERE expires_at < now()` or `SELECT ... FOR UPDATE` to prevent split brain.
- Renew must only succeed if `holder_id` matches current holder (compare-and-swap).

---

### 5.6.1 `lease_waiters` (FIFO Queue)

**Purpose:** FIFO queue for agents waiting on a held lease. Enables fair ordering when multiple agents contend for the same resource.

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| waiter_id | uuid | No | gen_random_uuid() | Primary identifier |
| tenant_id | text | No | — | Tenant scope |
| resource_key | text | No | — | The lease being waited on |
| attempt_id | uuid | No | — | The waiting attempt |
| action_key | text | No | — | For coalescing/debugging |
| queued_at | timestamptz | No | now() | FIFO ordering key |
| expires_at | timestamptz | No | — | Waiter timeout (default 10s from queued_at) |
| status | text | No | 'WAITING' | WAITING / NOTIFIED / GRANTED / EXPIRED / CANCELLED |
| notified_at | timestamptz | Yes | null | When waiter was notified of grant |
| created_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |

**Constraints**

- PK: `(tenant_id, waiter_id)`
- CHECK: `status IN ('WAITING', 'NOTIFIED', 'GRANTED', 'EXPIRED', 'CANCELLED')`
- CHECK: `expires_at > queued_at`
- UNIQUE: `(tenant_id, resource_key, attempt_id)` — one waiter per attempt per resource

**Indexes**

- `lease_waiters(tenant_id, resource_key, status, queued_at)` — FIFO lookup for next waiter
- `lease_waiters(tenant_id, attempt_id)` — lookup by attempt
- `lease_waiters(tenant_id, expires_at) WHERE status = 'WAITING'` — cleanup expired waiters

**FIFO Grant Logic**

```sql
-- When lease is released, grant to next waiter:
UPDATE lease_waiters
SET status = 'NOTIFIED', notified_at = now(), updated_at = now()
WHERE (tenant_id, resource_key, waiter_id) = (
  SELECT tenant_id, resource_key, waiter_id
  FROM lease_waiters
  WHERE tenant_id = $1 AND resource_key = $2
    AND status = 'WAITING'
    AND expires_at > now()
  ORDER BY queued_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

**Waiter Cleanup**

- Background job expires waiters where `expires_at < now() AND status = 'WAITING'`
- Waiters are cancelled when their attempt completes/fails

---

### 5.7 `governor_policies`

**Purpose:** durable policy config for budgets/backoff/attempt caps per (tool, action) and optional resource prefix.

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| tenant_id | text | No | — | Tenant scope |
| policy_id | text | No | — | Unique id |
| tool | text | No | — | |
| action | text | No | — | |
| resource_key_prefix | text | Yes | null | Optional scoping |
| max_concurrency | int | Yes | null | Null = default |
| qps | int | Yes | null | Requests/sec target |
| burst | int | Yes | null | Burst capacity |
| max_attempts | int | Yes | null | Max attempts for action |
| base_backoff_ms | int | Yes | null | |
| max_backoff_ms | int | Yes | null | |
| dedupe_window_ms | int | Yes | null | |
| join_window_ms | int | Yes | null | |
| created_at | timestamptz | No | now() | |
| updated_at | timestamptz | No | now() | |

**Constraints**

- PK: `(tenant_id, policy_id)`
- CHECK: `(max_concurrency IS NULL OR max_concurrency >= 1)`
- CHECK: `(qps IS NULL OR qps >= 1)`
- CHECK: `(burst IS NULL OR burst >= 0)`
- CHECK: `(max_attempts IS NULL OR max_attempts >= 1)`

**Indexes**

- `governor_policies(tenant_id, tool, action)`
- Optional: unique “active policy” constraint:
  - `UNIQUE(tenant_id, tool, action, COALESCE(resource_key_prefix,''))`

---

### 5.8 `circuits`

**Purpose:** durable circuit breaker state per (tenant, tool, action) (optional v0.1).

**Columns**
| Column | Type | Null | Default | Notes |
|---|---|---:|---|---|
| tenant_id | text | No | — | Tenant scope |
| circuit_key | text | No | — | e.g., `jira:create_issue` |
| tool | text | No | — | |
| action | text | No | — | |
| state | text | No | 'CLOSED' | CLOSED/OPEN/HALF_OPEN |
| failure_count | int | No | 0 | |
| opened_at | timestamptz | Yes | null | |
| next_probe_at | timestamptz | Yes | null | |
| updated_at | timestamptz | No | now() | |

**Constraints**

- PK: `(tenant_id, circuit_key)`
- CHECK: `state IN ('CLOSED','OPEN','HALF_OPEN')`
- CHECK: `failure_count >= 0`

**Indexes**

- `circuits(tenant_id, state, updated_at DESC)`

---

### 5.9 `execution_daily_stats`

**Purpose:** Pre-aggregated daily execution statistics per (tenant, tool, action). Populated by the background insights aggregation worker. Used exclusively by the `/v1/insights/*` read-only API endpoints. Never written by the hot write path.

**Columns**

| Column             | Type        | Null | Default | Notes                                     |
| ------------------ | ----------- | ---: | ------- | ----------------------------------------- |
| tenant_id          | text        |   No | —       | Tenant scope                              |
| stat_date          | date        |   No | —       | Aggregation date                          |
| tool               | text        |   No | —       | Tool name                                 |
| action             | text        |   No | —       | Action name                               |
| total_actions      | int         |   No | 0       | Actions initiated on this date            |
| total_attempts     | int         |   No | 0       | Total attempts (including retries)        |
| successful_actions | int         |   No | 0       | Actions that terminated SUCCESS           |
| failed_actions     | int         |   No | 0       | Actions that terminated FAILURE           |
| unknown_outcomes   | int         |   No | 0       | Actions still in UNKNOWN state            |
| replay_hits        | int         |   No | 0       | REPLAY_SUCCESS + REPLAY_FAILURE responses |
| avg_latency_ms     | int         |  Yes | null    | Average attempt duration                  |
| p95_latency_ms     | int         |  Yes | null    | 95th percentile attempt duration          |
| total_retry_waste  | int         |   No | 0       | Attempts beyond the first per action      |
| budget_denials     | int         |   No | 0       | Governor budget denials                   |
| lease_denials      | int         |   No | 0       | Lease acquisition denials                 |
| circuit_opens      | int         |   No | 0       | Circuit breaker open events               |
| computed_at        | timestamptz |   No | now()   | When this row was last computed           |

**Constraints**

- PK: `(tenant_id, stat_date, tool, action)`
- FK: `tenant_id → tenants(tenant_id)`
- CHECK: all count columns `>= 0`

**Indexes**

- `execution_daily_stats(tenant_id, stat_date DESC)` — tenant-scoped time-range queries
- `execution_daily_stats(tenant_id, tool, stat_date DESC)` — per-tool drill-down

**Operational notes**

- Populated by UPSERT (idempotent re-computation).
- RLS policy recommended: `tenant_id = current_setting('app.tenant_id')`.
- Retention: keep at least 90 days; optionally archive to cold storage for trend analysis.
- No foreign keys to `actions` or `attempts` (this is a materialized aggregate, not a normalized join target).

---

### 5.10 `hub_analyses`

**Purpose:** Pre-computed LLM analysis of aggregated execution data. Populated by the Hub analysis job (daily, after the aggregation worker). Used by the `GET /v1/insights/hub` read-only API endpoint. See `Documentation/ADR-0012-hub-llm-analysis.md`.

**Columns**

| Column         | Type        | Null | Default           | Notes                                                      |
| -------------- | ----------- | ---: | ----------------- | ---------------------------------------------------------- |
| tenant_id      | text        |   No | —                 | Tenant scope                                               |
| analysis_id    | uuid        |   No | gen_random_uuid() | Unique analysis identifier                                 |
| analysis_date  | date        |   No | —                 | Date of analysis (one per tenant per day)                  |
| insights       | jsonb       |   No | —                 | Array of insight objects (Zod-validated from LLM response) |
| model_provider | text        |   No | —                 | LLM provider used (e.g., `openai`)                         |
| model_name     | text        |   No | —                 | LLM model used (e.g., `gpt-5.2`)                           |
| input_summary  | jsonb       |  Yes | null              | Summary of aggregated stats sent to LLM (for auditability) |
| generated_at   | timestamptz |   No | now()             | When the LLM response was received                         |
| created_at     | timestamptz |   No | now()             | Row creation timestamp                                     |

**Insight JSON structure** (each element in `insights` array):

```json
{
  "severity": "info | warning | critical",
  "title": "string",
  "summary": "string",
  "recommendation": "string",
  "data_points": [{ "label": "string", "value": "string | number" }]
}
```

**Constraints**

- PK: `(tenant_id, analysis_id)`
- UNIQUE: `(tenant_id, analysis_date)` — one analysis per tenant per day
- FK: `tenant_id → tenants(tenant_id)`

**Indexes**

- `hub_analyses(tenant_id, analysis_date DESC)` — tenant-scoped latest analysis lookup

**Operational notes**

- Populated by INSERT (one row per analysis run). If re-run on the same day, UPSERT on `(tenant_id, analysis_date)`.
- RLS policy recommended: `tenant_id = current_setting('app.tenant_id')`.
- Retention: keep at least 90 days; older analyses can be archived.
- `input_summary` stores what was sent to the LLM for audit trails (aggregated stats only, no PII).
- No foreign keys to `execution_daily_stats` (this is a derived output, not a normalized join target).

---

## 6) Cross-table constraints + invariants (MUST)

### 6.1 Terminalization rules

- An action becomes terminal when a terminal attempt completes AND policy chooses to terminalize.
- Once `actions.status IN ('SUCCESS','FAILURE')`, it MUST NOT change.

Recommended enforcement:

- Update actions with `WHERE status NOT IN ('SUCCESS','FAILURE')`
- Optionally add trigger to reject updates changing a terminal status.

### 6.2 Attempt completion idempotency

Completing an attempt multiple times with the SAME terminal result must be idempotent.
Completing with a DIFFERENT terminal result must return CONFLICT.

Recommended enforcement:

- transactional update with `WHERE status IN ('IN_FLIGHT','UNKNOWN')` for first terminalization
- if update affects 0 rows, read current row and compare; return 200 if identical else 409

### 6.3 Tenant FK hygiene

All tenant tables should FK to `tenants(tenant_id)`.

---

## 7) Indexing strategy (v0.1)

**Read paths to optimize**

- `BeginAction` lookups: actions by (tenant_id, action_key)
- status polling: actions by (tenant_id, action_key), plus updated_at
- attempt history: attempts by (tenant_id, action_key, started_at desc)
- audit: attempt_events by (tenant_id, attempt_id, ts)

---

## 8) Operational notes

### 8.1 Migrations

- Use one migration per change.
- Never edit a shipped migration.
- Add constraints early (they’re the safety rails).

### 8.2 Partitioning (future)

When attempt_events volume gets large, partition by month on `ts`.

### 8.3 Retention

- attempts/actions: keep long (months/years) unless tenant requests purge
- attempt_events: shorter by default (30–90 days)

---

## 9) Files in this export

- `docs/db/01-data-model-spec.md` (this file)
- `docs/db/02-erd.mmd` (Mermaid ERD source)
- `docs/db/sql/00-types.sql` (optional starter)
- `docs/db/sql/01-tables.sql` (optional starter)
