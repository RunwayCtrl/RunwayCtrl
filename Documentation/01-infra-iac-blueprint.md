# RunwayCtrl — Infra / IaC Blueprint (v0.1)

| Field        | Value                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Product      | RunwayCtrl                                                                |
| Doc Type     | Infra / IaC Blueprint                                                     |
| Version      | v0.1                                                                      |
| Date         | January 21, 2026                                                          |
| Primary goal | A production-safe, reproducible deployment topology for the control plane |
| Infra style  | IaC-first (Terraform), immutable artifacts, staged environments           |

---

## 0) Why this matters (one paragraph)

RunwayCtrl is not “an app.” It’s an ops-grade coordination system. If infra is sloppy, you’ll ship retry storms, duplicate side effects, and invisible failures. This blueprint makes the infrastructure a first-class spec—so VSCode and the team can build and deploy without guessing.

---

## 1) Design goals and non-goals

### Goals (v0.1)

- **Single-region**, **multi-AZ** deployment (prod)
- Durable ledger (Postgres) + safe migrations
- Stateless services (API/governor/workers) deployed as containers
- Strong secrets and identity boundaries (least privilege)
- Observability that satisfies the **OTel contract** (traces/metrics/logs)
- Fast rollback and safe canary rollout

### Non-goals (v0.1)

- Multi-region active/active
- Hard multi-tenant “data-plane” isolation (beyond tenant_id scoping)
- Fully managed “workflow engine” (we’re control plane first)

---

## 2) Reference architecture (provider-agnostic)

### 2.1 Components

- **Ingress**: HTTPS termination + WAF (optional v0.1)
- **API service**: `runwayctrl-api` (BeginAction, Status, AttemptComplete, etc.)
- **Governor/decision service**: `runwayctrl-governor` (budgets, leases, circuits)
- **Worker(s)**: `runwayctrl-ledger-worker` (reconciliation, async jobs, outbox processing)
- **Postgres**: `runwayctrl-ledger-db` (system of record: actions/attempts/events)
- **Telemetry**: OpenTelemetry Collector (`otel-collector`)
- **Secrets manager**: API keys, DB creds, OTLP exporter creds
- **Artifact registries**: container registry + package registry for SDKs
- **Optional (v0.1)**: Redis for ephemeral rate counters (can stay DB-first initially)

### 2.2 Data flow (high-level)

1. Client/SDK → `runwayctrl-api` (ingress)
2. API checks ledger + governor policy, returns decision (PROCEED/PENDING/REPLAY/DENY)
3. Worker / SDK updates attempts (complete/unknown)
4. Telemetry emitted via OTel contract to backend

---

## 3) Opinionated v0.1 choice: keep infra simple, correctness strong

Pick one “boring” stack and win:

- **Containers + managed Postgres + OTel**
- Avoid adding dependencies unless they reduce correctness risk.

Recommended defaults:

- **Postgres** as the sole state system for v0.1 (ledger, leases, circuits, budgets)
- Optional Redis later if/when latency or write pressure demands it

---

## 4) Environment model

| Env       | Purpose               | Guardrails                | Data                |
| --------- | --------------------- | ------------------------- | ------------------- |
| `dev`     | local iteration       | no internet exposure      | synthetic           |
| `staging` | pre-prod verification | protected, limited access | synthetic + limited |
| `prod`    | customer traffic      | strongest controls        | real                |

Promotion rule:

- promote **image digests** / **package versions**, never rebuild.

---

## 5) Networking blueprint (generic)

### 5.1 VPC / Virtual Network

- **Public subnets**: ingress load balancer
- **Private subnets**: services + DB
- **NAT**: private subnets outbound (if needed)

### 5.2 Ingress

- HTTPS termination at load balancer
- TLS 1.2+ only
- Optional WAF rules:
  - rate limit by IP
  - block obvious scanners
  - geo restrictions (optional)

### 5.3 Service-to-service traffic

- Keep east-west traffic private
- Prefer mTLS later; v0.1 can rely on private networking + IAM roles + security groups

---

## 6) Compute blueprint

### 6.1 Services (containers)

- `runwayctrl-api` (stateless)
- `runwayctrl-governor` (stateless, reads/writes ledger)
- `runwayctrl-ledger-worker` (stateless, background jobs)
- `runwayctrl-insights-worker` (stateless, background aggregation — computes `execution_daily_stats` on a daily schedule)

### 6.2 Scaling

- API: autoscale on CPU + request rate + p99
- Governor: autoscale on CPU and decision latency
- Workers: autoscale on job queue depth (or DB backlog metrics)
- Insights worker: single instance is sufficient for v0.1 (idempotent UPSERT; no coordination needed)

### 6.3 Deployment strategy

- staging: rolling update + smoke tests
- prod: canary 1–5% then ramp (see CI/CD spec)

### 6.4 Multi-instance testing topology

> Required for Phase 8A validation. Not a production topology — a CI/test topology.

- `docker-compose.multi-instance.yml`: 3 `runwayctrl-api` instances (ports 3001/3002/3003) + 1 shared Postgres.
- Used by `testcontainers-node` test harness to validate CAS, lease, governor correctness across instances.
- CI runs this topology on PR merge to `main` and on a nightly schedule.
- All instances share the same Postgres connection string; no load balancer (tests target specific instances).

---

## 7) Data layer blueprint (Postgres)

### 7.1 Postgres setup (prod)

- Multi-AZ / HA
- Automated backups + PITR (point-in-time recovery)
- Encryption at rest (KMS)
- Encryption in transit (TLS)

### 7.2 Connection management

- Use a pooler/proxy if needed:
  - managed proxy (preferred) OR pgbouncer
- Enforce timeouts:
  - statement timeout
  - connection timeout

### 7.3 Migration discipline (must match CI/CD spec)

- expand → backfill → contract → cleanup
- two-phase deploy for breaking schema changes

### 7.4 Operational metrics (must)

- connections used / max
- query latency percentiles
- lock waits / deadlocks
- replication lag (if HA)

---

## 8) Async jobs / queueing (v0.1 options)

### Option A (recommended v0.1): Postgres job table

- `jobs` table + worker poll/lease
- Pros: fewer dependencies, strong correctness
- Cons: DB load, needs careful indexing

### Option B: Managed queue (SQS/PubSub/etc.)

- Worker consumes queue, writes ledger
- Pros: isolates workload, scalable
- Cons: more moving parts; at-least-once semantics require idempotency (which we have)

Recommendation:

- Start Option A; add Option B only if worker load becomes noisy.

---

## 9) Secrets + identity

### 9.1 Secrets manager (mandatory)

Store:

- DB credentials
- internal service tokens
- OTLP exporter creds
- customer API keys (if not stored hashed in DB)

### 9.2 IAM / identity model

- Each service has its own identity (role/service account)
- Least privilege:
  - API can read/write ledger
  - Worker can read/write jobs + ledger
  - No service has broad admin privileges

### 9.3 Key rotation

- Follow the secrets playbook (dual-read, then revoke)

---

## 10) Observability blueprint (OTel contract compliance)

### 10.1 OTel Collector

- Run as sidecar or daemon
- Receives OTLP from services
- Exports to:
  - tracing backend
  - metrics backend
  - logs backend

### 10.2 Metrics cardinality guardrails (mandatory)

- Never label metrics with:
  - action_key, attempt_id, request_id, tenant_id, resource_key
- Use low-cardinality labels:
  - route, method, status_code, decision, deny_reason, tool, action (bounded)

### 10.3 “Golden trace” requirement

After each deploy:

- run one BeginAction flow and confirm the trace has required spans/attrs.

---

## 11) Security posture (infra-facing)

- TLS everywhere (ingress and DB)
- WAF optional in v0.1, recommended before real customers
- Network isolation (private subnets for services/DB)
- Audit logging on control plane mutations
- Secrets in secret manager only
- Backups encrypted and access-controlled

---

## 12) Disaster recovery (v0.1 targets)

Suggested initial targets:

- **RPO** (data loss): 15 minutes (PITR + backups)
- **RTO** (restore time): 1–4 hours (single-region)

Drills:

- quarterly restore drill into isolated environment (see runbooks)

---

## 13) Terraform IaC layout (recommended)

Repository structure (suggested):

- `infra/terraform/`
  - `modules/`
    - `network/`
    - `compute/`
    - `database/`
    - `observability/`
    - `secrets/`
  - `environments/`
    - `dev/`
    - `staging/`
    - `prod/`
  - `bootstrap/` (remote state + locking)

State management:

- Remote state bucket + state locking (provider equivalent)

---

## 14) Bootstrap + bring-up plan (step-by-step)

1. Create remote state backend (bootstrap)
2. Provision networking (VPC/subnets/security groups)
3. Provision Postgres
4. Provision secrets + service identities
5. Provision container platform + services (API/governor/worker)
6. Provision OTel collector + dashboards/alerts (minimum)
7. Run migration + smoke test
8. Enable canary release strategy for prod

---

## 15) Concrete example: AWS mapping (reference)

This section gives “names you can terraform” without forcing AWS forever.

| Concern         | AWS reference                                               |
| --------------- | ----------------------------------------------------------- |
| Network         | VPC + public/private subnets + NAT                          |
| Ingress         | ALB + ACM certs + optional AWS WAF                          |
| Compute         | ECS Fargate (or EKS)                                        |
| DB              | RDS Postgres (Multi-AZ) + RDS Proxy                         |
| Secrets         | Secrets Manager + KMS                                       |
| Logs            | CloudWatch Logs                                             |
| Metrics/Tracing | OTel Collector → (Grafana Cloud / Honeycomb / X-Ray / etc.) |
| Registry        | ECR for images                                              |
| DNS             | Route53                                                     |

---

## 16) Alternative mappings (quick)

- **GCP**: VPC / Cloud Load Balancing / Cloud Run or GKE / Cloud SQL Postgres / Secret Manager
- **Azure**: VNet / Application Gateway / Container Apps or AKS / Azure Database for Postgres / Key Vault

---

## 17) Deliverables in this export

- `Documentation/01-infra-iac-blueprint.md` (this doc)
- `Documentation/02-topology-diagram.mmd` (Mermaid diagram)
- `Documentation/03-terraform-layout.md` (repo layout + module boundaries)
