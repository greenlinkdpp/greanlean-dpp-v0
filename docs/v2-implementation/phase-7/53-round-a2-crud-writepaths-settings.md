# Round A.2 — CRUD write paths, settings, and Manual Entry

Round A.2 closes only the Round A.1 UI/write-path gaps. It reuses the existing V2 domain services and capability/PDP enforcement; it does not introduce a parallel data model or a service-role client write path.

## Reused write paths

| Domain | Database and service | UI write surface |
| --- | --- | --- |
| Tenant | `tenant`; current-Tenant API and platform capability API | Platform create/edit/archive/delete; settings profile save |
| Organisation | `organisation_v2`; `organisationRoutes` | Settings create/edit/archive/delete |
| Product graph | Family, Model, SKU, Batch, Item; `productRoutes` / `productRepository` | Product Center plus advanced entity pages |
| Responsibility | `product_organisation_relation` (0037) | Model add/unlink/delete responsibility control |
| Manual claim | Existing `canonical_claim` Schema-driven flow | Data Workspace peer Manual Entry action |

Every authenticated tenant mutation sends the verified active tenant context and an idempotency key. The server remains authoritative for capability checks, tenant scoping, business constraints, and delete dependency reporting.

## UI closure

- Data Workspace now presents Manual Entry and Import Center as equal first-screen actions.
- Platform Console shows capability-gated Tenant create, edit, archive, and safe-delete actions. A Tenant containing Product, DPP, or membership data receives a server-side archive/block result instead of a hard delete.
- Settings contains an in-place current Tenant profile editor, plus an Organisation CRUD panel. The remaining settings cards preserve their existing routes.
- Product Center now exposes Model create/edit/archive/delete. Family, SKU, Batch, and Individual pages have the same real write controls; Batch retains its existing SKU link control.
- Model responsibility management adds, unlinks, and deletes only within the active Tenant. The relation's composite foreign keys prevent a foreign-Tenant Organisation from being bound.

## PreProd and security evidence

The persistent PreProd reference set remains unchanged: one Tenant, one Product Model (`GLR-P25A`), one public DPP (`DPP-GLR-EBIKE-000001`), and two Auth users. A.2 did not create hosted temporary fixtures, alter Auth, or touch Production.

Automated verification completed 251 tests, typecheck, lint, and a production build. The current security warning is retained as a separate blocker:

`public.greanlean_0012_data_backup` — `rls_disabled_in_public` — WARN.

No RLS policy was broadened or disabled by this round. The full structured evidence is in `evidence/round-a2-crud-preprod.json`.
