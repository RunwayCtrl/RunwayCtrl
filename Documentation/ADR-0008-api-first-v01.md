# ADR-0008 — API-first v0.1: UI is optional; correctness + ops come first

| Field  | Value                                                        |
| ------ | ------------------------------------------------------------ |
| ADR ID | ADR-0008                                                     |
| Title  | API-first v0.1: UI is optional; correctness + ops come first |
| Status | ACCEPTED                                                     |
| Date   | January 21, 2026                                             |
| Owners | Platform                                                     |
| Tags   | product, delivery, architecture                              |

---

## Context

The wedge is execution reliability. UI polish is valuable later but not required to validate the core control plane.

## Decision

Ship v0.1 as API + SDK + observability + ledger. UI (if any) is minimal and secondary.

## Options considered

1. Build a full dashboard UI first
2. Build a minimal UI in parallel with API
3. API-first with optional minimal UI later [chosen]

## Tradeoffs

### Pros

- Accelerates proving the hard part: correctness under chaos.
- Better dev-first adoption; easier integrations.

### Cons

- Harder to demo to non-technical stakeholders without a UI.
- May delay product storytelling for some buyers.

## Consequences

Docs and examples become the primary UX. Observability must be strong to compensate.

## How we will validate

SDK examples, golden trace debugging flow, and test matrix completion.

## References

- PRD
- Backend Structure
- Observability Spec
