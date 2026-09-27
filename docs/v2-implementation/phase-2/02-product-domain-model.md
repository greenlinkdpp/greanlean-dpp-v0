# 02 Product Domain Model

## Hierarchy

    Tenant
    ├── Product Family (optional parent of Model)
    └── Product Model
        ├── SKU 0:N
        ├── Batch 0:N
        │   └── Batch–SKU Link 0:N
        └── Individual Item 0:N

A Product Model may exist without a Family. A Batch belongs directly to one Model and may have zero, one, or many active SKU links. An Individual always belongs to a Model; both `sku_id` and `batch_id` are optional.

## Item shapes

The database supports all required identity shapes:

- Model only;
- Model + SKU;
- Model + Batch;
- Model + SKU + Batch.

When both SKU and Batch are present and `enforce_batch_sku_link = true`, an active and temporally valid Batch–SKU Link is mandatory.

## Lifecycle

Family, Model, SKU, Batch, and Item use `DRAFT`, `ACTIVE`, `INACTIVE`, and `ARCHIVED`. Batch–SKU Link uses `ACTIVE` and `INACTIVE`. Identifier uses `ACTIVE` and `RETIRED`. Phase 2 intentionally does not introduce publication lifecycle state.

