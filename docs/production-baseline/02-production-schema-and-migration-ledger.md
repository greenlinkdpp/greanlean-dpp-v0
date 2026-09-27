# 02 Production Schema and Migration Ledger

## Conclusion

The anonymous Production REST surface proves that many expected relations are present. It does not expose the migration ledger, system catalogs, constraints, indexes, functions, triggers, enums, or extensions. Consequently, repository-to-Production schema equivalence is **NOT VERIFIED**.

## Repository migration baseline

The repository contains 21 forward migrations and matching rollback contracts.

| Migration | Repository checksum prefix | Production | Status | Risk |
|---|---|---:|---|---|
| `0001_project_migration_ledger.sql` | `bde9b3d605aa` | ledger relation responds but rows hidden from anon | UNKNOWN | P0 |
| `0006_schema_registry.sql` | `45b18877ed7b` | registry tables respond | UNKNOWN | High |
| `0007_field_definitions_and_rules.sql` | `35e21e5767f5` | field/rule tables respond | UNKNOWN | High |
| `0009_battery_domain.sql` | `a0090ef68260` | battery model/batch/item tables respond | UNKNOWN | High |
| `0010_battery_dynamic_metrics.sql` | `15fc8c8bbe42` | metric relation responds | UNKNOWN | High |
| `0011_registry_adapter.sql` | `1defb24ca3cb` | Registry relations respond | UNKNOWN | Medium |
| `0012_unified_dpp_publications.sql` | `3a3be3434ad0` | legacy publication artifacts indirectly observable | UNKNOWN | High |
| `0013_identity_and_access.sql` | `e0433bff0633` | identity/access relations respond | UNKNOWN | P0 |
| `0014_battery_operating_data_integration.sql` | `a296cdc3d272` | complete credential/trigger installation not readable | UNKNOWN | High |
| `0015_dpp_publication_foundation.sql` | `6b1590ba985c` | publication relation returns permission denied, proving relation exposure | UNKNOWN | P0 |
| `0016_dpp_publication_review.sql` | `2be96d052802` | review relation returns permission denied | UNKNOWN | High |
| `0017_publication_review_function_permissions.sql` | `31ea8993b777` | function grants not readable | UNKNOWN | High |
| `0018_canonical_publication_finalization.sql` | `e53be6263b38` | public pages render; exact functions/triggers not readable | UNKNOWN | P0 |
| `0019_file_evidence_lifecycle_foundation.sql` | `57574fdf21b4` | file/lifecycle relations respond | UNKNOWN | High |
| `0020_system_operation_security_boundary.sql` | `18878f9ba613` | system-only grants/triggers not readable | UNKNOWN | High |
| `0021_publication_backfill_and_read_cutover.sql` | `1ad4dcc431d4` | backfill state and cutover marker not readable | UNKNOWN | P0 |
| `0022_pgcrypto_runtime_search_path.sql` | `5840cb23b9c8` | extension/function search path not readable | UNKNOWN | High |
| `0023_canonical_public_snapshot_resolution.sql` | `44391262e8ad` | canonical public output is observable, function definition is not | UNKNOWN | P0 |
| `0024_canonical_schema_identifier_compatibility.sql` | `ae45cb514b10` | compatibility function definition not readable | UNKNOWN | High |
| `0025_p0_battery_pilot_foundation.sql` | `c2dc15897a21` | ownership/hierarchy relations respond | UNKNOWN | P0 |
| `0026_battery_regulatory_datapoints_v2.sql` | `9c911c4f816b` | catalogue installation not fully enumerated | UNKNOWN | Medium |

No migration may be marked `MATCH` until the Production ledger supplies migration number, timestamp, result, and checksum or an independently approved schema snapshot proves the same state.

## Runtime relation probes

All probes used anonymous `GET ...?select=*&limit=0` or `HEAD`; no business rows were downloaded.

| Expected relation | HTTP | Interpretation |
|---|---:|---|
| `dpp_organisation` | 200 | relation exists on REST surface; RLS/definition unknown |
| `dpp_user_membership` | 200 | current real name exists |
| `dpp_organisation_membership` | 404 | not an actual relation; instruction name maps to `dpp_user_membership` |
| `dpp_product_access_grant` | 200 | relation exists |
| `dpp_product_ownership` | 401 | relation exists but anon lacks table privilege |
| `schema_definition`, `schema_version`, `field_definition`, `validation_rule`, `access_policy` | 200 | relations exist |
| `battery_model_profile`, `battery_batch`, `battery_item`, `battery_field_value`, `battery_operating_metric` | 200 | relations exist |
| `battery_passport_profile` | 404 | not an actual relation; current implementation uses `battery_model_profile` |
| `dpp_publication`, pointer, review, validation run/result | 401 | relations exist; anon table privilege denied |
| `dpp_identifier_alias` | 200 | relation exists |
| Registry mapping/submission/proof | 200 | relations exist |
| file asset/version/evidence link/lifecycle event | 200 | relations exist |
| `products`, `product_versions`, sector values, templates | 200 | legacy relations exist |
| `greanlean_migration_ledger` | 200 with zero anon-visible rows | relation exists; applied ledger remains unreadable |

HTTP 200 does not prove columns, constraints, RLS, policy correctness, or migration completeness. HTTP 401 proves privilege denial, not policy correctness.

## Required metadata comparison

| Metadata | Repository expected | Production actual |
|---|---|---|
| Tables | defined across migrations | partially observed via REST |
| Columns/types | defined in SQL | **NOT VERIFIED** |
| Primary/foreign keys | defined in SQL | **NOT VERIFIED** |
| Unique/check constraints | defined in SQL | **NOT VERIFIED** |
| Indexes | defined in SQL | **NOT VERIFIED** |
| Views/materialized views | defined/absent per repo | **NOT VERIFIED** |
| Functions | numerous `greanlean_*` functions | **NOT VERIFIED** |
| Triggers | immutability, hierarchy, append-only guards | **NOT VERIFIED** |
| Enums | mainly checks/text in repo | **NOT VERIFIED** |
| Extensions | `pgcrypto` expected | **NOT VERIFIED** |

## Critical constraints requiring authenticated metadata evidence

| Constraint | Expected | Production | Risk |
|---|---|---|---|
| membership → organisation | FK | NOT VERIFIED | Critical |
| ownership → organisation/product | composite ownership integrity | NOT VERIFIED | Critical |
| grant → user/product/organisation | scoped FK/guards | NOT VERIFIED | Critical |
| batch → model/product/organisation | composite consistency | NOT VERIFIED | Critical |
| item → model/batch/product/organisation | composite consistency | NOT VERIFIED | Critical |
| item serial unique within organisation | partial/unique index | NOT VERIFIED | High |
| publication version uniqueness | unique product/item version | NOT VERIFIED | Critical |
| one current pointer | unique pointer/index | NOT VERIFIED | Critical |
| publication content immutability | trigger | NOT VERIFIED | Critical |
| supersedes lineage | FK/guard | NOT VERIFIED | High |
| canonical payload hash | generated/stored during publication | NOT VERIFIED | Critical |

## Required follow-up evidence

A read-only database role or approved Supabase dashboard export must provide:

1. Supabase internal migration history and `greanlean_migration_ledger` rows.
2. `pg_catalog`/`information_schema` metadata for the categories above.
3. Function definitions, volatility, owner, `security definer`, and search path.
4. Trigger installation and table privilege grants.
5. A signed schema-drift artifact with the Production project ref and timestamp.

Until then, **Production Schema vs Repository: UNKNOWN**.
