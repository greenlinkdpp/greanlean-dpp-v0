# Phase 7 Reference Data Import and Mapping

Status: **PASS**
Environment: **Hosted PreProd**
Migration head: **0035**

## Durable identities

| Resource | ID |
| --- | --- |
| Tenant | `bbfcbe5f-9786-4fcb-af32-9dbac33f2a4b` |
| Organisation | `43ab1d4c-27de-420c-8773-0dfb5bf643c0` |
| Data Source | `2b456927-f402-4405-a899-18c0aded4840` |
| Mapping Version | `7bf09454-5508-44e0-b79e-0626e7df3a26` |
| Schema Definition | `0fbf0ecc-a3bf-41c2-819e-50f6794eb799` |
| Schema Version | `f5b8bbc2-b3b6-4440-841f-bc6ce3a54e92` |

## Workflow exercised

1. Registered the `EN-50604(3).xlsx` Data Source as `EXCEL`, `UNVERIFIED`, and `INTERNAL_SYNTHETIC_REFERENCE`.
2. Created 22 raw Source Records, one per deterministic SKU/Individual.
3. Created one versioned semantic Mapping Profile and immutable active Mapping Version `1.0.0`.
4. Mapped 17 named semantic objects by JSON pointer; no positional column mapping was used.
5. Ran the real Mapping Dry Run and Commit endpoints for every Source Record.
6. Persisted a Transformation Result, Provenance Record, and Canonical Claim chain for every mapped field.
7. Resolved each Individual candidate through the production V2 resolution engine before review.

## Results

| Result | Count | Status |
| --- | ---: | --- |
| Source Records | 22 | PASS |
| Successful Transformations | 22 | PASS |
| Mapping fields per record | 17 | PASS |
| Provenance Records | 374 | PASS |
| Canonical Claims | 374 | PASS |
| Mapping errors | 0 | PASS |
| Blocking validation issues | 0 | PASS |

Unmapped input is limited to the deliberately internal `internal_source` object. It is retained in the raw Source Record and never becomes a public Claim. Source vendor/source model provenance therefore remains auditable internally without entering the public passport.

## Field and audience boundary

Public fields include the synthetic warning, neutral product/item identity, technical specifications, unverified sustainability/compliance metadata, lifecycle, and safe provenance summary. Repair/service fields and BMS snapshots require legitimate-interest access. The policy-demo object is internal only.

Public leakage tests over all 22 published projections found:

- no `TL-*` internal source model code;
- no raw source record;
- no source vendor identity;
- no BMS snapshot;
- no internal access policy object;
- no fake GTIN or Registry identifier;
- no verified wording for unverified evidence.

## Idempotency

The complete build was rerun against an already complete state. Tenant, Organisation, Data Source, Mapping, Schema and Schema Version IDs remained unchanged. Counts remained exactly 1/8/22/8/22/22/22 with 374 Claims and 22 published Versions. No duplicate identifier, Passport, Version, or BMS snapshot was created.

`IDEMPOTENT_RERUN = PASS`
