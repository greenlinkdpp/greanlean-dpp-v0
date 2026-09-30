# Round A.1 — final productization, CRUD, organisation linkage, and PreProd cleanup

Date: 2026-09-29

## Result

Round A.1 applies only to local development and `greanlean-dpp-preprod`. The Production application, data, and Auth service were not changed.

### Product and API closure

- Platform Tenant endpoints provide create/read/edit and dependency-aware hard-delete protection; a Tenant with Product, DPP, or membership data must be archived.
- Tenant Organisations now have item-level read/edit/archive/delete routes. Product, batch, responsibility, and data-source dependencies are shown in the API error and block silent deletion.
- Product Family, Model, SKU, Batch, and Individual item routes now provide dependency-aware DELETE in addition to the existing create/read/update/archival flow. Claims, Passports, and hierarchy dependencies return `PRODUCT_DELETE_BLOCKED`; published data cannot be deleted.
- Migration `0037_v2_product_organisation_relationships` adds an additive, tenant-enforced `product_organisation_relation` table. It retains the distinction between Tenant (workspace/security boundary) and Organisation (real-world entity), uses the current Tenant for all joins, and permits Model defaults or SKU-specific responsibility relations. Supported relations include manufacturer, brand owner, supplier, importer, recycler, certifier, cell supplier, BMS supplier, and pack manufacturer.
- The Model detail now exposes the `责任主体` / Responsible organisations view. The snapshot is tenant-scoped; cross-Tenant binding is rejected by composite tenant foreign keys.
- Publication Center is centered on candidate/review/approval/publication/immutable history. Public Display is a separate read-only surface for public DPP, Resolver, public URL, QR, and audience preview.
- The redundant content-header escapes to the website, platform console, and public demo were removed. Platform return remains through the application navigation.

## PreProd dry run and cleanup

The dry run identified five attributable synthetic/reference Tenants and 22 attributable synthetic/reference Auth users. It stopped on no unknown Tenant and no unknown user. The keep graph was calculated from `DPP-GLR-EBIKE-000001`, not inferred from a display name:

`DPP → Item → SKU / Batch → Model GLR-P25A → Family`

The complete machine-readable before/keep/delete/after evidence is in `evidence/round-a1-final-preprod-cleanup.json`. The outcome is:

| Resource | Before | After |
| --- | ---: | ---: |
| Tenants | 5 | 1 |
| Organisations | 6 | 1 |
| Models | 32 | 1 |
| Public Passports | 51 | 1 |
| Auth users | 22 | 2 |

Persistent reference set:

- Tenant: `greanlean-reference-mobility` (original ID preserved)
- Model: `GLR-P25A`
- Public DPP: `DPP-GLR-EBIKE-000001`
- Owner: `songweinie@gmail.com` with Platform authority and zero Tenant memberships
- Demo tenant user: `reference-author@preprod.greanlean.invalid`, active `tenant_admin` membership in GreanLean Reference Mobility and no Platform role

The unique reference DPP remains ACTIVE, points to an immutable PUBLISHED version, has one current pointer and one Resolver mapping. Public DPP smoke verification returned HTTP 200. The cleanup did not add synthetic supplier relations; the retained Model's existing Manufacturer relation remains the minimal necessary Organisation dependency.

## Test-data governance

`PERSISTENT_PREPROD_REFERENCE = TRUE` applies only to the documented reference set above. All future temporary Tenant, Organisation, Product, DPP, fixture, and Auth data must use an isolated test database, a transaction rollback, or explicit teardown. Hosted PreProd is not a long-lived fixture store.

## Security and RLS

No RLS policy was broadened, disabled, or changed to `USING (true)` / `WITH CHECK (true)`. Migration 0037 enables RLS and uses capability-gated policies. The previously recorded Supabase Advisor warning `rls_disabled_in_public` remains unresolved for existing public-schema objects outside this round's scope.

`RLS_SECURITY_BLOCKER_REMAINS = YES`

## Verification

- Migration head: `0037`; relation table exists with RLS enabled.
- Local lint, typecheck, all 249 unit/integration tests, and production build passed.
- No password, hash, token, or secret was read into evidence or stored in the repository.
- No Production deployment, data write, Auth change, traffic switch, Registry enablement, or connector activation occurred.
