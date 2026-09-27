# 09 Phase 2 Security Results

## Live Development results

The Phase 2 verifier passed the following negative and positive controls on the Development project:

- Tenant A Product rows were not visible to Tenant B;
- cross-Tenant and cross-Model composite relationships were rejected by PostgreSQL;
- an Item with SKU + Batch but no active link was rejected;
- a Partner with exact `PRODUCT_MODEL` scope could read that Model and could not cross Tenant/resource scope;
- a read-only Tenant member could read but could not write through direct RLS or API;
- a forged `x-tenant-id` was denied;
- invalid GTIN and duplicate active identifiers were rejected;
- the same persistent idempotency key replayed the original result, while a changed payload conflicted;
- PDP allow/deny decisions and command purposes were recorded in the append-only audit.

Synthetic Development fixtures only were used. No real customer or Production row was read for migration or test purposes.

