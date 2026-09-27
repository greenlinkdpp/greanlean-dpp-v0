# Observability and Alerting Results

- Structured request logging includes correlation and status data.
- Synthetic availability failures crossed the proposed alert threshold.
- Local alert webhook delivery returned 202 and acknowledgment.
- Proposed service thresholds are recorded in evidence.
- Production managed-backup freshness can now be queried, and the latest completed timestamp is recorded.

The local rehearsal passed, but external on-call routing, retention policy, backup-freshness alert delivery, and accountable owner acknowledgment are not configured. Therefore `OBSERVABILITY_GATE = BLOCKED` for a real Pilot cutover.

Evidence: `evidence/preproduction-observability-rehearsal.json`, `evidence/production-pro-managed-backup-evidence.json`.
