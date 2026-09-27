# 04 Product RLS and Security

## RLS policy model

RLS is enabled on all seven Phase 2 tables. Tenant reads require `product.view`; Tenant writes require `product.edit`, except identifier writes, which require `identifier.manage`.

Partner reads reuse the Phase 1 authorization and exact resource-scope function. A Partner does not receive list-wide access and cannot infer a resource in another Tenant. No Partner write policy exists.

## Server policy boundary

Every Product API calls `requireV2PolicyContext` before the repository. The repository rejects unverified policy contexts and always re-applies the resolved Tenant filter. The client-supplied `x-tenant-id` is only a requested scope, never authority.

All writes require an `Idempotency-Key`, persist request/response identity through the Phase 1 idempotency store, and emit a PDP decision purpose such as `product_model.create`, `product_item.update`, `batch_sku_link.deactivate`, or `identifier.retire`.

## Safe errors

The API publishes stable non-leaking errors including `PRODUCT_ACCESS_DENIED`, `PRODUCT_MODEL_MISMATCH`, `TENANT_RELATIONSHIP_MISMATCH`, `SKU_MODEL_MISMATCH`, `BATCH_MODEL_MISMATCH`, `ITEM_MODEL_MISMATCH`, `BATCH_SKU_LINK_REQUIRED`, `IDENTIFIER_CONFLICT`, `IDENTIFIER_INVALID`, and `LEGACY_MAPPING_AMBIGUOUS`.

