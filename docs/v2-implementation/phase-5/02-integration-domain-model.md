# Integration Domain Model

The Integration domain is an anti-corruption layer. External payloads never become the canonical DPP or bypass Schema, Mapping, Claim, Provenance, review or publication boundaries.

| Entity | Ownership | Purpose |
|---|---|---|
| `connector_definition` | platform | Versioned connector type and capability metadata |
| `connector_instance` | tenant | Environment, endpoint policy, retry/rate profile, cursor and circuit state |
| `connector_credential_reference` | tenant | Secret-provider reference and verification metadata only |
| `connector_rate_limit_counter` | tenant/service-only | Atomic fixed-window count by connector, tenant, credential scope and route |
| `connector_job` | tenant | Idempotent command/import execution snapshot |
| `connector_attempt` | tenant | Immutable per-attempt evidence |
| `connector_receipt` | tenant | Redacted, bounded external receipt |
| `connector_dead_letter` | tenant | Terminal retry evidence and operator disposition |
| `connector_webhook_event` | tenant | Verified inbound event and replay identity |
| `external_identifier_mapping` | tenant | Issuer/scheme-qualified external ID to internal subject |
| `registry_submission_v2` | tenant | Immutable-version Registry state machine |
| `connector_import_session` | tenant | Preflight/dry-run/commit reconciliation result |
| `bms_aggregation_snapshot` | tenant | Windowed telemetry aggregate, never raw high-frequency telemetry |
| `connector_audit_event` | tenant | Append-only integration audit |

All tenant-owned relationships include tenant-consistency constraints. Product subjects remain owned by Product Core, Schema and Mapping by Phase 3, and immutable DPP Versions and Resolver pointers by Phase 4.

Seeded non-Production definitions are `REGISTRY_TEST`, `GENERIC_REST`, `GENERIC_FILE_IMPORT`, `ERP_ADAPTER`, `MES_ADAPTER`, `PLM_ADAPTER` and `BMS_AGGREGATION`.
