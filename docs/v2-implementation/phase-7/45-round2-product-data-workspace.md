# Round 2 — Product Data Workspace

Date: 2026-09-29  
Baseline: Round 1 accepted RC `1214b90a33c991c511e883d31314dad9f22a07b4` / tree `c904b9960905f29808d632392205a2fe2ef439c4`  
Environment: isolated PreProd `greanlean-dpp-preprod` (`efhiaufukjchxqhbmpvq`)  
Result: **PASS**

## Implemented scope

- Product Center keeps Family optional on Model, requires a Manufacturer Organisation, and preserves Model-owned parallel SKU and Batch dimensions.
- Batch–SKU relationships are explicit, Tenant-scoped, idempotent, and server-validated through `/api/v2/batch-sku-links`.
- Model detail preserves the active Tenant query, shows manufacturer, claim coverage, passport coverage, source/audit history, and candidate readiness.
- Manual DPP entry is schema-driven. Field choices expose code, type, unit, granularity, requirement, and access metadata; INHERIT, OVERRIDE, CLEAR, NOT_APPLICABLE, and UNKNOWN remain distinct and canonical writes retain evidence/provenance.
- Mapping workspace creates explicit DRAFT mapping versions and rules using deterministic transform choices. Unmapped fields are surfaced as an explicit decision and are never silently dropped.
- Validation workspace groups BLOCKING/WARNING/INFO/PASS issues and shows NOT_READY / READY_WITH_WARNINGS / READY_FOR_REVIEW candidate states without publishing.

## Safety boundary

All writes use the selected Tenant header, server-side PDP, capability checks, and persistent idempotency keys. No V2 migration, Production write, traffic switch, Registry enablement, customer access, connector activation, Review/Approve/Publish redesign, or public Resolver/QR change was performed.

Round 1 accepted reference topology remains the comparison baseline: 8 Models, 22 SKUs, 22 Individuals, 374 Claims, 22 Passports, 22 Versions, 22 Current Pointers, 22 Resolver Mappings, and 22 BMS Snapshots.
