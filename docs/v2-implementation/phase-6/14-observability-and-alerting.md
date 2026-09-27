# Observability, alerting, retention, and residency

## Current controls

API responses/logs carry a correlation ID. Structured logging redacts keys matching authorization, cookie, password, secret, token, service role, and API key. PDP decisions, publications, and connector actions have dedicated audit tables in repository migrations. Connector jobs, attempts, receipts, dead letters, pending Registry submissions, and latency fields provide alert inputs.

No Production dashboard, alert routing, retention configuration, on-call roster, or synthetic Resolver check was verified. `OBSERVABILITY_GATE = BLOCKED`.

## Pilot alerts

| Severity | Trigger examples | Required action |
|---|---|---|
| SEV-1 | Cross-tenant access, service-role leak, published payload mutation, resolver outage, unrecoverable data loss | Disable affected switches, incident command, rollback, customer/security communication |
| SEV-2 | Sustained API/Resolver error or latency breach, publication failures, DB/Storage degradation, dead-letter surge, Registry pending-age breach | Freeze cutover expansion, investigate, rollback if window exceeded |
| SEV-3 | Isolated connector failure, single rejected import, non-critical schema drift | Triage in business hours, preserve evidence |

Pilot monitoring must include API/resolver error rate and latency, publication failures, RLS/PDP deny anomalies, DB health, Storage failures, connector failures, dead letters, Registry pending age, deploy health, and backup freshness. Thresholds and notification destinations require Operations/Security owner approval.

## Retention matrix

| Data class | Proposed retention | Status |
|---|---|---|
| Source records/raw payloads | Minimum needed for mapping dispute and replay; encrypt/restrict | PROPOSED |
| Canonical Claim history/provenance | Passport lifetime plus legal/audit period | PROPOSED |
| Evidence files | Contract/regulatory lifetime; legal hold support | PROPOSED |
| Published versions | Indefinite immutable history or statutory period | PROPOSED |
| Security/publication audit | At least 12 months, longer if required | PROPOSED |
| Connector receipts | 12 months with payload minimization | PROPOSED |
| Dead letters | 30–90 days after resolution, unless incident/legal hold | PROPOSED |

No retention value is accepted and no automatic deletion was introduced.

## Residency readiness

Production is currently in Singapore (`ap-southeast-1`). Each tenant requires a recorded residency preference, data classification, permitted region, and cross-border allowed/blocked decision before Pilot. Pre-Production must use synthetic data unless sanitized Production-derived data receives approval. Multi-region and China/EU active-active are out of scope.
