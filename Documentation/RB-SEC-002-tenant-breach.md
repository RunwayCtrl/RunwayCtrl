# RB-SEC-002 - Suspected tenant boundary breach (Sev0)

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| Runbook ID         | RB-SEC-002                                       |
| Title              | Suspected tenant boundary breach (Sev0)          |
| Severity           | Sev0                                             |
| Owner              | Platform                                         |
| Last updated       | January 21, 2026                                 |
| Primary dashboards | Audit logs; DB access logs; Control Plane Health |
| Primary alerts     | Data exposure suspected                          |

---

## Summary

Handle suspected cross-tenant data access. Treat as Sev0.

## Immediate containment (do first)

1. Freeze potentially affected endpoints (read paths) if needed.
2. Revoke access paths suspected in logs (keys, roles).
3. Preserve evidence: logs, traces, DB audit logs.
4. Notify leadership and security owner.

## Diagnosis

- confirm scope: which tenants, what data
- identify vector: query bug, auth bug, mis-scoped cache, misconfigured tenant_id filter

## Resolution

- patch immediately
- rotate credentials
- run data integrity checks
- prepare customer communications and postmortem

## Validation

- tenant isolation tests pass
- additional logging confirms correct tenant_id scoping
