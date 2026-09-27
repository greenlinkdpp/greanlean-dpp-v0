# ADR-006: Canonical Data and Provenance

## Context

Current data enters through manual editing, imports, fixed tables, dynamic battery values, evidence files and BMS integrations. Provenance fields exist but are fragmented.

## Problem

Canonicalizing only at publication hides mapping errors until late and cannot consistently explain who supplied a value, its original unit, transformation, review or evidence.

## Decision

Canonicalization begins at ingestion using versioned source, mapping and transformation objects. Store subject-scoped canonical claims and first-class provenance. Corrections supersede claims; they do not erase lineage.

## Alternatives Considered

1. Canonicalize only when publishing — rejected because editing/validation paths diverge.
2. Copy all raw source payloads forever — rejected due privacy, residency and cost.
3. Store provenance as free-text columns — rejected because it is not queryable or consistently enforceable.

## Why

Early canonicalization yields reproducible validation, deterministic publication and evidence-backed trust without coupling core data to source formats.

## Consequences

- mapping profiles and transformations require lifecycle/versioning;
- storage and privacy policies must govern raw data;
- resolution returns origin/provenance for each field;
- unmapped data becomes visible error/quarantine rather than silent loss.

## Migration Impact

Legacy values are transformed by reviewed mapping versions. Original table/key/ID and checksums are recorded. Ambiguous values remain quarantined.

## Compatibility

V1 tables remain source records until migrated. V1-shaped responses can be projected from canonical claims after comparison.

## Security Impact

Raw sensitive values are excluded from public snapshots. Provenance access follows classification and purpose. Transformation jobs and evidence references are tenant-scoped and audited.

## Open Questions

- raw record retention and regional storage;
- trusted source/automatic verification policy;
- allowed transformation runtime;
- provenance export requirements.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
