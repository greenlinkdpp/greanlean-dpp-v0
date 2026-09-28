# SOODOO Pilot Deterministic Data Inventory

```text
SOODOO_PILOT_SCOPE_DISCOVERY = BLOCKED
PILOT_SCOPE_DETERMINISTIC = FALSE
SOODOO_BUSINESS_DATA_REQUIRED = TRUE

PILOT_MODEL_COUNT = 0
PILOT_PASSPORT_COUNT = 0
PILOT_IDENTIFIER_COUNT = 0

UNKNOWN_COUNT = 0
AMBIGUOUS_COUNT = 0
REVIEW_REQUIRED_COUNT = 0

PRODUCTION_WRITE_PERFORMED = NO
```

## Discovery identity

| Field | Value |
|---|---|
| Production project | `greanlen-dpp` / `lpxdbysgmdsjhxrjzhly` |
| Production migration head | `0035` |
| Read-only query time | `2026-09-28T00:52:58.300114Z` |
| Tenant ID | `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| Tenant code | `soodoo-e-bike` |
| Tenant name/status | `SOODOO E-bike` / `ACTIVE` |
| Organisation relationship | none |

The Production Management database query endpoint was called with `read_only: true`. No Production write, publication, feature flag, deployment or traffic change occurred.

## Deterministic relationship closure

Starting only from the canonical Tenant ID, the approved V2 relationships returned:

| Relationship category | Qualifying rows |
|---|---:|
| `organisation_v2` | 0 |
| `product_model` | 0 |
| `sku` | 0 |
| `product_batch` | 0 |
| `batch_sku_link` | 0 |
| `product_item` | 0 |
| `dpp_passport` | 0 |
| `product_subject_identifier` | 0 |
| `resolver_mapping` | 0 |
| `legacy_entity_mapping` | 0 |
| `source_record` | 0 |
| `external_identifier_mapping` | 0 |

There are therefore no selected Models, Passports or Identifiers to enumerate. Counts for `UNKNOWN`, `AMBIGUOUS` and `REVIEW_REQUIRED` are zero because no record was selected; they do not convert an empty business scope into a deterministic Pilot scope.

## V1 source check

Exact normalized searches for `SOODOO` and `SOODOO E-bike` returned zero V1 `customers`, zero V1 `dpp_organisation` rows and zero V1 `products`. More importantly, the Tenant has no approved Organisation or `legacy_entity_mapping` relationship that could make unrelated V1 rows reachable from the Tenant root.

The five Phase 6 ambiguous legacy decisions remain `EXCLUDE_FROM_PILOT`. One exact decision-row ID is currently present in Production; the other four exact IDs are absent. Similar-looking records with different IDs were not treated as the same record, remapped or selected.

## Missing deterministic source categories

At least the following must exist through an approved relationship before discovery can pass:

1. One or more canonical SOODOO `product_model` rows linked by `tenant_id`, or approved `legacy_entity_mapping` evidence that maps identified SOODOO V1 product/model sources into the canonical Tenant.
2. For each selected Model, canonical or approved-mapped Passport source records bound to a supported Model/SKU/Batch/Item subject.
3. Existing canonical or approved-mapped identifiers needed to reproduce lookup behaviour; values must come from source evidence and must preserve identifier-type semantics.
4. If V1 Organisation/customer ownership is the source boundary, an approved Tenant-to-Organisation/customer relationship rather than a name-only match.

No IDs, identifiers or business relationships were invented. Per the stop boundary, Pilot data migration and cutover must not resume until the user reviews this inventory and supplies or approves deterministic SOODOO business source data.

```text
NEXT ACTION =
WAIT FOR USER ACCEPTANCE OF THE SOODOO PILOT DATA INVENTORY
BEFORE RESUMING PHASE 7

PHASE 8 ENTERED = NO
```
