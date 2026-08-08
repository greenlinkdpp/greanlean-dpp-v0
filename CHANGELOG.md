# Changelog

All notable changes to Greanlean DPP are recorded here. This project follows
semantic versioning once the first stable release is declared.

## [Unreleased]

### Added

- Unified evidence file centre with immutable versions, SHA-256 checksums,
  multi-field evidence links, access-controlled downloads, and battery
  readiness integration.
- Registry and blockchain integration status for every product workspace.

### Changed

- Publication-review submission is idempotent for repeated requests.
- Battery readiness now includes server-derived dynamic values consistently.
- Evidence and verification state is derived from uploaded files and review
  records instead of editable status selectors.

### Security

- A file checksum no longer marks compliance evidence as verified.
- Blockchain anchoring is disabled without a verified external connector and
  never generates a local transaction hash.

### Validation

- 84 business and integration tests, TypeScript, and the Next.js production
  build pass.

## [0.5.0] - 2026-07-25

### Added

- Unified public DPP page system for LMT batteries, stationary industrial
  batteries, textiles, and consumer electronics.
- Versioned publication snapshots used by public pages and export endpoints.
- Organisation membership, role approval, product grants, access requests, and
  append-only access audit records.
- Server-authorized public, professional, regulatory, and internal projections.
- Battery operating-data credentials and ingestion APIs with idempotency,
  validation, append-only logs, and lifecycle events.
- Restricted battery snapshots, history, and lifecycle-event presentation.
- Chinese and English public content for the homepage and all four primary
  passport cases.

### Changed

- Reframed the homepage as a cross-industry DPP platform with a dedicated
  Battery Passport section.
- Removed the stationary industrial battery's separate public presentation and
  routed all primary cases through the same page components.
- Consolidated online product presentation around database publication
  snapshots instead of full static fallback records.
- Login now performs a full navigation before resolving the authorized DPP
  projection.

### Security

- URL audience parameters no longer elevate access.
- Public battery APIs exclude item telemetry and restricted lifecycle data.
- Integration secrets are stored as hashes and checked before privileged
  database clients are initialized.
- Direct anonymous and broad authenticated access policies were removed from
  restricted identity, publication, and operating-data tables.

### Validation

- Repository hygiene, TypeScript, 56 business tests, 11 migration tests, and
  the Next.js production build pass.
- Four primary passports pass Chinese/English desktop regression checks.
- Homepage and four passports pass 390 px, 768 px, 1280 px, and 1440 px
  responsive checks without horizontal overflow or broken images.
- Vercel Preview and authorized battery operating-data access were manually
  verified.

### Known limitations

- No production BMS, EMS, gateway, or maintenance-system vendor is connected.
- Initial battery operating records remain clearly identified in backend data
  provenance as unverified initial data.
- EU DPP Registry production submission remains disabled pending final official
  battery semantics and production credentials.

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
