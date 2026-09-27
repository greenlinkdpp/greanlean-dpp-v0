# 01 Phase 2 Implementation Summary

## Scope

Phase 2 implements only the V2 Product Core in the isolated Development environment:

- Product Family, Product Model, SKU, Batch, Batch–SKU Link, and Individual Item;
- Product subject identifiers and collision rules;
- additive database migration `0028` and its rollback;
- Tenant- and Partner-scoped RLS;
- capability-gated `/api/v2` Product endpoints with PDP audit and persistent idempotency;
- a non-destructive V1 legacy classification adapter.

No Phase 3 schema/canonical/provenance, Passport, publication, resolver, public QR, Registry Production, VC, UNTP, Catena-X, or EDC work is included.

## Deliverables

- Migration: `supabase/migrations/0028_v2_phase2_product_core.sql`
- Rollback: `supabase/rollbacks/0028_v2_phase2_product_core.down.sql`
- API routes: `app/api/v2/{product-families,product-models,skus,batches,batch-sku-links,items,identifiers}`
- Product Core server boundary: `lib/server/v2/productRoutes.ts`, `productRepository.ts`, and `productHierarchyResolver.ts`
- Identifier and legacy adapters: `lib/v2/productIdentifiers.ts`, `productErrors.ts`, and `legacyProductMapping.ts`
- Live Development verifier: `scripts/verify-v2-phase2-development.mjs`
- OpenAPI: `docs/v2-implementation/phase-1/openapi-v2.yaml`, updated to Phase 2

## Environment boundary

The Development target guard verified project ref `qlrbrwrpvtnlphajvqao` and distinct project/API fingerprints before live tests. Production ref `lpxdbysgmdsjhxrjzhly` was never used for a write.

