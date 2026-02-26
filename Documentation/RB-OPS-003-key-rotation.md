# RB-OPS-003 - Secret/key rotation

| Field              | Value                               |
| ------------------ | ----------------------------------- |
| Runbook ID         | RB-OPS-003                          |
| Title              | Secret/key rotation                 |
| Severity           | Sev2                                |
| Owner              | Platform                            |
| Last updated       | January 21, 2026                    |
| Primary dashboards | Auth failures; Control Plane Health |
| Primary alerts     | Key compromise; rotation schedule   |

---

## Summary

Rotate API keys, DB creds, and OTLP exporter creds safely.

## Immediate containment (if compromise suspected)

- revoke compromised key
- restrict tenant access if needed

## Rotation steps (general)

1. Create new secret (do not overwrite old yet).
2. Deploy service configured to accept both (dual-read) if supported.
3. Update clients to use new secret.
4. Remove old secret after grace period.
5. Audit logs for continued use of old key.

## Validation

- auth failure rate stable
- no services using revoked secrets
