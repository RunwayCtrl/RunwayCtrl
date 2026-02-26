# RB-INC-009 - OTel pipeline failure (missing traces/metrics/logs)

| Field              | Value                                               |
| ------------------ | --------------------------------------------------- |
| Runbook ID         | RB-INC-009                                          |
| Title              | OTel pipeline failure (missing traces/metrics/logs) |
| Severity           | Sev3                                                |
| Owner              | Platform                                            |
| Last updated       | January 21, 2026                                    |
| Primary dashboards | Telemetry pipeline; Control Plane Health            |
| Primary alerts     | Missing metrics; missing traces                     |

---

## Summary

Observability is required for operating RunwayCtrl. This runbook covers missing or partial telemetry.

## Symptoms

- dashboards blank or stale
- traces not appearing
- metrics not scraping
- logs missing trace_id correlation

## Diagnosis

1. Check OTel collector health (pods/processes, receivers).
2. Verify services are exporting OTLP (endpoint, auth).
3. Confirm sampling not set to 0% accidentally.
4. Confirm Prometheus scrape is configured (if used).

## Immediate containment

- If telemetry failure blocks incident response, temporarily increase server logs (tenant-scoped) while fixing pipeline.

## Resolution

- Restart collector
- fix OTLP endpoints
- fix exporter credentials
- validate contract: required span names and metric names exist

## Validation

- can find a trace for a fresh BeginAction within 2 minutes
- key metrics update at expected cadence
