# Round D — Security & Operations Closeout (PreProd)

Environment: isolated Hosted PreProd `greanlean-dpp-preprod` (`efhiaufukjchxqhbmpvq`) only  
Deployment: `dpl_5SadpxjbA7HEQb2Q2hRtXhiVNjbT` (Ready)  
Production deployment, data write, Auth change and traffic switch: **NO**

## Tenant deletion root cause and resolution

The archived temporary Tenant `test001` (`4359cfd6-235b-4b6c-9346-9405a505e61f`) had no business records, memberships, organisation records, DPP records, resolver mappings, catalog references, or audit references. It did have five tenant-scoped IAM `role` records. The former API checked only models, passports and memberships, then attempted a direct root delete. The `role.tenant_id` foreign key is `ON DELETE RESTRICT`, so PostgreSQL correctly rejected the delete and the route returned an unhelpful generic failure.

Pre-delete dependency report:

| Dependency | Count |
| --- | ---: |
| Memberships, organisations, families, models, SKUs, batches, individuals, DPPs, published versions, resolver mappings, demo refs | 0 each |
| Policy/platform audit refs, partner authorizations, scope grants, legacy mappings, idempotency records | 0 each |
| Other tenant foreign-key dependencies | 0 |
| Tenant IAM roles | 5 |

Migration `0039_round_d_security_operations_closeout.sql` adds a service-role-only, security-definer function. The deployed route remains Platform-capability protected and invokes this function only after server authentication. In one transaction it re-reads and locks the target, requires `ARCHIVED`, protects `greanlean-reference-mobility`, checks every tenant-scoped base table, removes only the empty tenant's IAM roles, deletes the tenant, and writes an append-only Platform audit record with the deleted Tenant metadata (not an orphaned tenant foreign key).

Result: `test001` deleted; five empty tenant IAM roles deleted; Tenant count changed **2 → 1**. The remaining Tenant is `GreanLean Reference Mobility` (ACTIVE). The deletion audit count is one, and orphan memberships count is zero.

## RLS advisory resolution

`public.greanlean_0012_data_backup` was a one-time migration-0012 rollback snapshot, not an application table. Source audit found runtime references: **0**; migration/rollback references: **4**; tests: **2**. Database metadata before mutation found foreign-key references: **0**, view references: **0**, trigger references: **0**.

Accordingly, migration 0039 drops the unused public table rather than adding a permissive RLS policy. Post-migration `to_regclass(...)` is null. The Supabase Security Advisor recheck contains no matching `greanlean_0012_data_backup` / `rls_disabled_in_public` finding.

## Lead and operational regression

The exact C.2 evidence Lead is retained as one intentional PreProd evidence row:

- ID: `92225b03-3a0e-4643-af49-be976cd1727c`
- Status: `new`
- Company/contact: `TEST PREPROD GreanLean` / `test-preprod-lead@example.invalid`
- Source: `homepage:zh`
- Duplicate count: `1`

Hosted PreProd checks passed: homepage HTTP 200, demo catalog HTTP 200 with 8 entries, public LMT DPP HTTP 200, JSON resolver HTTP 200, legacy QR redirect resolves to HTTP 200, unauthenticated Tenant deletion returns HTTP 401, and invalid/honeypot Lead submission returns HTTP 400. The LMT public DPP contains all three deterministic BMS trend labels. The two expected Auth users remain unchanged.

The service-role source audit found four server-only uses under `lib/server`; no `NEXT_PUBLIC_*` service-role/secret variable exists in application or public client paths.

## Quality gates

All passed against the exact Round D tree:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (261 passing)
- `pnpm test:migrations` (58 passing)
- `pnpm build`

Owner human acceptance remains **PENDING**. Do not deploy Production.
