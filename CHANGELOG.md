# Changelog

All notable changes to Greanlean DPP are recorded here. This project follows
semantic versioning once the first stable release is declared.

## [Unreleased]

## [0.4.0] - 2026-07-24

### Added

- Battery Passport positioning and capability content on the public homepage.
- GreenVault ESS-14.3 stationary industrial battery demo above 2 kWh.
- Stable product, demo and passport aliases, QR access and structured JSON.
- Reusable grouped battery presentation with public and restricted data states.
- Synthetic operating-metric history and non-404 document placeholders.
- Idempotent industrial battery database seed and targeted rollback.
- Battery demo impact analysis, contract tests and release notes.

### Changed

- Featured cases now prioritise LMT and industrial battery passports while
  retaining textile and consumer-electronics examples.
- Battery data is presented as product information instead of a raw regulatory
  field catalogue.
- Product Hub demo sync includes the industrial battery and labels demo records.

### Preserved

- Existing LMT battery, textile, consumer-electronics, construction-material
  and furniture data and routes.

### Known limitations

- Demonstration data only; no official conformity assessment.
- No live BMS connection.
- No automated EU DPP Registry registration.
- Placeholder documents contain no laboratory identity, certificate number or
  signature.

### Foundation

- Phase 1 current-system architecture audit.
- Phase 2 product specification, target architecture, database design, EU
  Battery DPP mapping, and regulatory uncertainty register.
- Phase 3 engineering foundation: numbered database migrations and rollbacks,
  Schema Registry domain types, field applicability rules, feature flags,
  structured API logging, correlation IDs, and automated checks.
- Phase 4 battery module: six legal categories, five BatteryPass-Ready schema
  configurations, the normalized v1.3 100-field catalog, model/batch/item data,
  append-only operating metrics, an 11-step editor, readiness dimensions, and
  server-side audience projections.

### Engineering

- Expanded local development, environment, testing, migration, and deployment
  documentation.

### Compatibility

- Existing product tables, demo data, dashboard routes, public DPP pages, and
  exports remain on the legacy-compatible path.
- No production database migration or deployment is included in Phase 3.
- Phase 4 remains disabled by default until migrations `0009` and `0010` have
  been validated and applied outside production first.
