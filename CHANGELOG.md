# Changelog

All notable changes to Greanlean DPP are recorded here. This project follows
semantic versioning once the first stable release is declared.

## [Unreleased]

### Added

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

### Changed

- Expanded local development, environment, testing, migration, and deployment
  documentation.

### Compatibility

- Existing product tables, demo data, dashboard routes, public DPP pages, and
  exports remain on the legacy-compatible path.
- No production database migration or deployment is included in Phase 3.
- Phase 4 remains disabled by default until migrations `0009` and `0010` have
  been validated and applied outside production first.
