# ADR-0005 — OpenTelemetry-first observability contract (spans/metrics/logs)

| Field  | Value                                                           |
| ------ | --------------------------------------------------------------- |
| ADR ID | ADR-0005                                                        |
| Title  | OpenTelemetry-first observability contract (spans/metrics/logs) |
| Status | ACCEPTED                                                        |
| Date   | January 21, 2026                                                |
| Owners | Platform                                                        |
| Tags   | observability, otel, operations                                 |

---

## Context

RunwayCtrl is an ops-heavy product. If it cannot explain decisions and retries, it fails as a control plane.

## Decision

Adopt OpenTelemetry end-to-end with a contract-first approach: stable span names, attributes, metric registry, and structured logs correlated to traces.

## Options considered

1. Logs-only observability (ship it and grep later)
2. Vendor-specific APM instrumentation
3. OpenTelemetry with a stable internal contract [chosen]

## Tradeoffs

### Pros

- Portable across backends; avoids vendor lock-in.
- Makes debugging distributed failure modes feasible.
- Contract reduces drift across services and engineers.

### Cons

- Requires discipline and sampling strategy to control cost.
- Semantic conventions evolve; we must pin our own stable keys.

## Consequences

We maintain an OTel contract doc and validate it in tests.

## How we will validate

Contract validator in CI for core flows; dashboards for governor + tool reliability.

## References

- Observability + OTel Contract
