# ADR-0011: Multi-Instance Correctness + Chaos Validation

| Field    | Value                          |
| -------- | ------------------------------ |
| Status   | Accepted                       |
| Date     | 2026-01-21                     |
| Context  | Phase 8A planning              |
| Relates  | ADR-0002, ADR-0004             |

---

## Context

RunwayCtrl's architecture externalizes all state to Postgres and uses Compare-and-Swap (CAS) patterns for correctness: no in-process singletons, no local caches that affect correctness, no sticky sessions. This design allows horizontal scaling by adding more control-plane instances behind a load balancer.

However, **the absence of local state is an architectural claim, not a proven fact**. The article "7 Failure Modes When AI Agents Move from Demo to Production" warns that hidden assumptions about local state are a common production failure mode. Systems that work with one instance may fail subtly with two.

We need to **validate** the multi-instance correctness claim with real tests, not just assert it in documentation.

## Decision

We will add a **multi-instance correctness and chaos validation harness** (Phase 8A) that proves RunwayCtrl's guarantees hold when multiple control-plane instances share the same Postgres.

### Test Infrastructure

- **testcontainers-node** for programmatic Docker management in tests.
- **docker-compose.multi-instance.yml**: 3 control-plane instances (ports 3001/3002/3003) + 1 shared Postgres.
- **Test harness** in `apps/control-plane/src/__tests__/multi-instance/`: configurable instance count, concurrent request helpers, assertion utilities.
- **CI integration**: GitHub Actions workflow runs on PR merge to `main` and on a nightly schedule.

### Test Categories (6)

1. **CAS Correctness:** Concurrent BeginAction with same ActionKey across instances → exactly one PROCEED. Concurrent CompleteAttempt → exactly one success.
2. **Lease Contention:** Concurrent lease acquisition → exactly one winner. Lease TTL expiry after instance crash. Renewal rejection from wrong holder.
3. **Governor/Circuit Consistency:** Budget exhaustion across instances stays within limits. Circuit OPEN state visible to all instances immediately.
4. **Cross-Instance Operations:** Instance A creates attempt, Instance B completes it, Instance C queries status → consistent state.
5. **Connection Pool Resilience:** One instance saturated → others healthy. Saturated instance recovers.
6. **Crash Recovery:** Instance killed mid-transaction → Postgres rollback → consistent state. Postgres restart → all instances recover.

### Why testcontainers-node

- Already used in the Node.js ecosystem for Docker-based integration tests.
- Programmatic control over container lifecycle (start, stop, kill, pause).
- Works with Vitest (our existing test framework).
- No custom Docker orchestration scripts needed.

## Alternatives Considered

1. **Single-instance tests only:** Rejected. Cannot validate multi-instance correctness claims. This is the gap we're explicitly closing.
2. **Manual testing with Docker Compose:** Rejected. Not reproducible, not CI-integrated, not regression-proof.
3. **Kubernetes-based testing (e.g., Kind/k3s):** Rejected for v0.1. Too much infra complexity. Docker Compose + testcontainers is sufficient for correctness validation.
4. **Jepsen-style formal verification:** Considered for v0.2. The current approach is pragmatic and covers the critical paths. Formal verification can be added later for the most critical invariants.

## Consequences

- **Positive:** High confidence that RunwayCtrl's CAS/lease/governor guarantees hold in production multi-instance deployments.
- **Positive:** Regression protection — any future code change that breaks multi-instance correctness will be caught in CI.
- **Positive:** The test harness doubles as documentation of correctness guarantees (executable specification).
- **Negative:** CI pipeline time increases (Docker-based tests are slower than unit tests). Mitigated by running on merge + nightly only.
- **Negative:** testcontainers-node adds a dev dependency and requires Docker in CI.

## References

- [Implementation Plan Phase 8A](Implementation%20Plan.md)
- [Infra Blueprint Section 6.4](01-infra-iac-blueprint.md)
- [Security Guidelines Section 7.5](Security%20Guidelines.md)
- [State Machines and Invariants](01-state-machines-and-invariants.md)
