# RB-OPS-002 - Backup/restore drill

| Field              | Value                    |
| ------------------ | ------------------------ |
| Runbook ID         | RB-OPS-002               |
| Title              | Backup/restore drill     |
| Severity           | Sev2                     |
| Owner              | Platform                 |
| Last updated       | January 21, 2026         |
| Primary dashboards | DB Health; Backup status |
| Primary alerts     | Backup failure           |

---

## Summary

Procedure for verifying backups and performing a restore drill.

## Steps

1. Verify backups are running on schedule and are restorable.
2. Restore into an isolated environment (never restore into prod directly).
3. Run consistency checks:
   - can query actions/attempts
   - constraints intact
4. Run a small integration test suite against restored DB.

## Validation

- restore completes within target time
- test suite passes on restored snapshot
