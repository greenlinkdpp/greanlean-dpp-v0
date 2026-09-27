# File Import and Mapping

`POST /api/v2/imports` supports CSV and JSON in three explicit actions:

- `PREFLIGHT`: parse, locate invalid rows/fields and identify external schema drift;
- `DRY_RUN`: apply a pinned Mapping Version without canonical writes;
- `COMMIT`: create append-oriented Canonical Claims and Provenance using the same pinned mapping.

An active Mapping Version and a connector-bound Phase 3 Data Source are mandatory. Unmapped fields block commit unless an explicit reviewed decision permits them. Existing active Claims are not silently overwritten; reconciliation classifies unchanged, new, changed, conflict and invalid records.

Every import session persists adapter kind, input fingerprint, mapping version, schema fingerprint, row counts, reconciliation summary and result. Synthetic ERP/MES/PLM commits were verified end to end and produced traceable Claim/Provenance records.
