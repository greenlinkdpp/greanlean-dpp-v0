# ADR-005: Schema Authority

## Context

V1 contains fixed domain tables, `dpp_field_templates`, Schema Registry definitions and battery-specific field values.

## Problem

Allowing all mechanisms to evolve independently produces conflicting definitions, validation, access levels and regulatory mappings.

## Decision

Schema Registry (`Schema Definition → Version → Field Definition → Rules/Policies`) is the sole authority for all new V2 fields. Published versions are immutable. Legacy structures are mapped compatibility sources and receive no new V2-only field definitions.

## Alternatives Considered

1. Keep per-sector code catalogues authoritative — rejected due deployment coupling and drift.
2. Keep templates and Registry equal — rejected because conflicts have no deterministic winner.
3. Store arbitrary JSON without definitions — rejected because validation, provenance and interoperability fail.

## Why

A single authority gives stable IDs, versioned meaning, consistent validation and shared UI/API behavior.

## Consequences

- Schema governance and publish workflow are required;
- code consumes field metadata instead of hardcoded lists;
- mappings are needed for all legacy fields;
- incompatible changes require a new Schema Version.

## Migration Impact

Existing `field_definition` is reused where semantics match. Templates/fixed columns receive reviewed mappings. Unknown or lossy mappings are quarantined.

## Compatibility

V1 pages continue reading their existing structures. Adapters translate canonical definitions to V1 shapes during coexistence.

## Security Impact

Field access classification is versioned and enforced server-side. Schema publication is restricted and audited; draft fields cannot become public by UI flag alone.

## Open Questions

- Schema governance owners and approval quorum;
- Tenant extension policy;
- localization ownership;
- compatibility rules for regulatory effective dates.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
