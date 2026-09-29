# Platform Console and active Tenant context

Date: 2026-09-29  
Hosted PreProd deployment: `dpl_7ntfD7zmosspCRhBM3invmRYsZXX`  
Stable alias: `https://greanlean-dpp-preprod.vercel.app`  
Result: **PASS**

## Platform scope

`/dashboard/platform` is now the default Platform Admin destination. It exposes Tenant management, all organisations, all products, all DPPs, import/operations status, and platform audit activity. The verified view displayed 5 Tenants, 32 product models, and 51 DPP passports; every business row retained and displayed its Tenant owner.

The Platform Admin identity is derived from the explicit platform assignment rather than a legacy access-context shortcut. Anonymous callers and Tenant-only contexts are rejected by the platform API contract tests.

## Tenant scope

The Platform Console selector links to `/dashboard/v2?tenant=<safe-code>`. The Tenant workspace resolves this reference again on the server and persistently displays `Active Tenant: <name> · Platform Operator`. Navigation preserves the safe Tenant reference.

PreProd switching verified both existing synthetic Tenants:

- Tenant A model `P7-PLATFORM-A-20260929` belongs only to `phase1-tenant-a`.
- Tenant B model `P7-PLATFORM-B-20260929` belongs only to `phase1-tenant-b`.
- A forged Tenant UUID returned HTTP 403 with `ACTIVE_TENANT_INVALID` and a DENY platform audit row.
- A Tenant A context attempting to patch the Tenant B model returned HTTP 404; the Tenant B model remained unchanged.

No Tenant data moved during switching. No Platform Operator Tenant membership was created.

Browser evidence:

- `output/playwright/platform-console-preprod.png`
- `docs/v2-implementation/phase-7/evidence/platform-admin-multitenant-preprod.json`

```text
PLATFORM_CONSOLE = PASS
PLATFORM_ADMIN_GLOBAL_TENANT_VISIBILITY = PASS
PLATFORM_ADMIN_GLOBAL_PRODUCT_VISIBILITY = PASS
PLATFORM_ADMIN_GLOBAL_DPP_VISIBILITY = PASS
ACTIVE_TENANT_CONTEXT = PASS
TENANT_SCOPED_WRITE = PASS
FORGED_TENANT_CONTEXT = DENIED
CROSS_TENANT_MUTATION = DENIED
```
