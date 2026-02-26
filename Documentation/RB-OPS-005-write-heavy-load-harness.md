# RB-OPS-005: Write-Heavy Correctness Harness

| Field     | Value                                      |
| --------- | ------------------------------------------ |
| Runbook   | RB-OPS-005                                 |
| Category  | Operations — Correctness Validation        |
| Severity  | Gate blocker (Phase 8)                     |
| Owner     | Engineering                                |
| Status    | Draft                                      |

---

## Purpose

Verify that RunwayCtrl's ledger invariants hold under heavy concurrent write load, including multi-instance deployment scenarios. This harness proves that CAS patterns, lease serialization, and governor budgets remain correct under stress.

## When to run

- Before Phase 8 and Phase 8A Gate sign-off.
- After changes to transaction logic, CAS patterns, lease acquisition, or governor budgets.
- Nightly CI (recommended).

## Prerequisites

- Multi-instance setup: 3 control-plane instances sharing one Postgres (via `docker-compose.multi-instance.yml`).
- Test tenant with API key provisioned on each instance.
- OTel collector running.

## Invariant checks (MUST all pass)

### INV-1: CAS uniqueness

- **Test:** 100 concurrent BeginAction requests with the same ActionKey, distributed across 3 instances.
- **Invariant:** Exactly ONE action record exists. Exactly ONE PROCEED decision issued. All other responses are REPLAY_* or PENDING.
- **Verification:** Query DB directly: `SELECT COUNT(*) FROM actions WHERE action_key = ?` must equal 1.

### INV-2: Terminal immutability

- **Test:** After an action is terminalized (SUCCESS or FAILURE), send 50 concurrent complete/unknown requests.
- **Invariant:** Terminal status never changes. All late-arriving completes get 409 or idempotent 200 (same result).
- **Verification:** Query DB: `terminal_status` unchanged across all checks.

### INV-3: Attempt completion uniqueness

- **Test:** 10 concurrent CompleteAttempt requests for the same attempt_id from different instances.
- **Invariant:** Exactly ONE succeeds (200). Others get 409 CONFLICT or idempotent 200 (same status/outcome).
- **Verification:** Query DB: attempt has exactly one terminal status set.

### INV-4: Lease serialization

- **Test:** 50 concurrent lease acquire requests for the same ResourceKey from different instances.
- **Invariant:** Exactly ONE lease is active at any time. Others receive PENDING or LEASE_DENIED.
- **Verification:** Query DB: `SELECT COUNT(*) FROM leases WHERE resource_key = ? AND expires_at > now()` must equal 1.

### INV-5: Budget enforcement

- **Test:** Set a budget of 10 attempts for a tool. Fire 100 concurrent BeginAction requests from 3 instances.
- **Invariant:** Total attempts created does not exceed budget limit.
- **Verification:** Query DB: `SELECT COUNT(*) FROM attempts WHERE action_key LIKE ?` must be <= budget limit.

### INV-6: Circuit breaker consistency

- **Test:** Trigger circuit OPEN on one instance. Immediately query circuit state from all instances.
- **Invariant:** All instances see OPEN state (no stale CLOSED reads from Postgres).
- **Verification:** All instances return DENY with circuit_open reason.

### INV-7: Tenant isolation under concurrency

- **Test:** Run concurrent requests for 2 different tenants across 3 instances.
- **Invariant:** No cross-tenant data leakage. Each tenant sees only their own actions/attempts.
- **Verification:** Query DB with each tenant's scope; verify zero overlap.

## Execution

```bash
# From repo root
pnpm --filter control-plane test:multi-instance

# Or via Docker Compose
docker compose -f docker-compose.multi-instance.yml up -d
pnpm --filter control-plane test:correctness-harness
docker compose -f docker-compose.multi-instance.yml down
```

## Reporting

- Pass/fail per invariant.
- Timing: total harness duration, per-invariant duration.
- DB state snapshot on failure (for debugging).
- CI artifacts: test output + Postgres logs + OTel traces.

## Failure handling

- Any invariant failure is a **P0 bug** — stop the release.
- Create regression test for the specific failure.
- Fix must include a test that reproduces the original failure.

## Related

- [Implementation Plan Phase 8A](Implementation%20Plan.md)
- [ADR-0011: Multi-Instance Chaos Validation](ADR-0011-multi-instance-chaos-validation.md)
- [RB-OPS-004: Basic Load Test](RB-OPS-004-basic-load-test.md)
- [State Machines and Invariants](01-state-machines-and-invariants.md)
