# 03 Product Database and Constraints

## Additive tables

Migration `0028` creates seven new tables and does not alter V1 or Phase 1 tables:

| Table | Purpose |
|---|---|
| `product_family` | optional classification/family |
| `product_model` | core product identity |
| `sku` | market/configuration variation of one Model |
| `product_batch` | Model-owned manufacturing batch |
| `batch_sku_link` | temporal 0:N Batch–SKU relation |
| `product_item` | individual serialized or un-serialized unit |
| `product_subject_identifier` | normalized identifiers for Product subjects |

## Consistency controls

- Composite foreign keys carry `tenant_id` through every hierarchy edge.
- SKU and Batch must reference a Model in the same Tenant.
- Batch–SKU Link includes `model_id`; both referenced rows must match the same Tenant and Model.
- Item Model/SKU/Batch composite keys prevent cross-Tenant and cross-Model combinations.
- `v2_validate_item_batch_sku_link` enforces an active link when an Item specifies both optional relations.
- Tenant changes are rejected by the Phase 1 immutable-Tenant trigger.
- Explicit constraint names provide stable safe API codes for Model mismatch cases.

## Reversibility

`0028_v2_phase2_product_core.down.sql` drops policies first, then the seven tables in reverse dependency order, then Phase 2 functions, and finally the `0028` ledger row. It does not remove or change V1/Phase 1 objects.

