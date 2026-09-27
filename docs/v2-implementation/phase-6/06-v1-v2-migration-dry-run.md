# V1 to V2 migration dry run

## Scope and method

The available Development rehearsal was read-only and deterministic. It classified legacy `products` rows using the versioned mapping logic in `lib/v2/legacyProductMapping.ts`; it did not create V2 mapping records or alter source data.

Required mapping coverage for the formal Pre-Production run remains: Tenant, Organisation, Model, SKU, Batch, Item, identifiers, Schema fields, Canonical Claims, Passport identity, legacy publications, resolver aliases, and legacy URLs.

## Development result

| Metric | Result |
|---|---:|
| Source `products` rows | 5 |
| AUTO_MAPPABLE/MAPPED | 0 |
| REVIEW_REQUIRED | 5 |
| UNMAPPABLE/REJECTED | 0 |
| Writes performed | 0 |
| Deterministic run hash | `683ba8ce667da897c88ff1ef7187ee85b988c26a3a9235119d7d4f8926b3e697` |
| Repeat hash match | PASS |

All rows remain `REVIEW_REQUIRED` because `products.sku` semantics have not been approved. No Model/SKU distinction was guessed.

## Gate result

The algorithm is repeatable, but the mandated clean Pre-Production migration, idempotent rerun, target reconciliation, rollback, and complete entity coverage were not executed. `MIGRATION_GATE = BLOCKED`.
