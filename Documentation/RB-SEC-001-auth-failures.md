# RB-SEC-001 - Auth failures / suspected key abuse

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| Runbook ID         | RB-SEC-001                           |
| Title              | Auth failures / suspected key abuse  |
| Severity           | Sev1                                 |
| Owner              | Platform                             |
| Last updated       | January 21, 2026                     |
| Primary dashboards | Auth dashboard; Control Plane Health |
| Primary alerts     | Auth failures spike                  |

---

## Summary

Respond to spikes in 401/403 or signs of API key abuse.

## Symptoms

- auth failures spike from a single IP range
- unusual request patterns per tenant

## Immediate containment

- rate limit offending IPs (edge/WAF)
- revoke suspected compromised keys
- require key rotation (RB-OPS-003)

## Diagnosis

- identify affected tenant(s)
- confirm whether failures are misconfiguration vs attack

## Validation

- auth failures drop
- no further suspicious traffic
