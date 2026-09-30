# Round A — Productization UI / IA Refactor

## Scope and boundary

Round A reorganises the existing V2 product surface only. No parallel domain model, schema migration, Production data change, registry enablement, or Production traffic change was introduced.

The implementation is deployed only to PreProd:

- Project: `greanlean-dpp-preprod`
- Stable URL: `https://greanlean-dpp-preprod.vercel.app`
- Deployment: `dpl_9pbcDxidArV5LAVkw8LQrq8Bff5Y`
- Immutable URL: `https://greanlean-dpp-preprod-99nijmyk3-songweinie-1175s-projects.vercel.app`

## Product changes

- Added a shared text-only `BrandWordmark` and routed `BrandLogo` through it. The legacy image asset remains in the repository but is not rendered by the Round A UI.
- Added a six-item Tenant Workspace primary navigation: Overview, Product Center, Data Workspace, Publication Center, Public Display, and Settings.
- Kept all technical areas reachable through an Advanced disclosure and preserved existing deep links and domain APIs.
- Added a Product Center tree with Family → Model → SKU / Batch → Individual drill-down while retaining parallel SKU/Batch domain semantics.
- Grouped Platform Console inventory by Tenant and added model, SKU, batch, individual, DPP, publication, draft/review, completeness, and last-updated summary slots.
- Merged Import and Mapping into one Import Center flow with Upload → Preflight → Mapping → Completeness → Preview → Confirm → Result steps and visible completeness counters.
- Productised Manual Entry with a 260px step rail and applicability-oriented sections.
- Renamed the Canonical Claims operator surface to `护照字段总表`; translated resolution states to `继承 / 本级覆盖 / 清空 / 不适用 / 未知` in Chinese while keeping enum values unchanged.
- Moved Organisation, Users & Permissions, Data Sources, Normalization, and Data Quality into Settings/Advanced paths; Data Quality remains visible in overview/import/readiness surfaces.
- Kept public DPP content unchanged apart from the shared text wordmark treatment.

## Security and data model

- No RLS policy was changed.
- Existing `activeTenantId`, PDP checks, RLS, capability checks, platform global reads, and Tenant-scoped writes remain in place.
- Platform Tenant summaries add read-only counts from existing `organisation_v2`, `product_model`, `sku`, `product_batch`, `product_item`, `dpp_passport`, and `dpp_version` tables only.
- No migration was added or executed.
- The existing `rls_disabled_in_public` finding remains a Production Promotion blocker and is not altered by this round.

## Verification

- `npm run lint` — PASS
- `npm run typecheck` — PASS
- `npm run test` — PASS (249 tests)
- `npm run test:migrations` — PASS
- `npm run build` — PASS
- PreProd deployment build — PASS
- Anonymous `/api/v2/platform/context` — 401 AUTH_REQUIRED
- Stable PreProd homepage — text `GreanLean` present; legacy image wordmark not referenced in served HTML

The host Mac was locked during this turn, so the final human browser review of the deployed Platform Console, Tenant Workspace, Product Center, Manual Entry, and Import Center is intentionally left for Owner acceptance. No automated result is presented as a substitute for that review.

## Boundary assertions

```text
PRODUCTION_DEPLOYED = NO
PRODUCTION_DATA_WRITE_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
PRODUCTION_FILE_IMPORT_ENABLED = NO
PRODUCTION_REGISTRY_ENABLED = NO
```

## Stop boundary

Round A stops here. Do not start Round B until Owner reviews the new PreProd UI.
