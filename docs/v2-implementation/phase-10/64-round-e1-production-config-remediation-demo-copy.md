# Round E.1 — Production Configuration Remediation and Demo Copy Polish

Generated: `2026-09-30`

## Scope and boundary

Round E.1 changed only the Hosted PreProd Demo Showcase catalog entries.  It did not deploy an application to Production, execute a Production migration, write Production data, change Production Auth, or change Production environment configuration.

## PreProd Demo catalog result

The canonical public catalog fields are `demo_showcase_entry.summary_en` and `demo_showcase_entry.summary_zh`; `components/v2/demo/DemoShowcase.tsx` renders those fields directly.  No product description was added as a React literal.

The PreProd-only updater `scripts/phase7/apply-round-e1-preprod-demo-copy.mjs` updated exactly eight existing public synthetic catalog entries and verified their post-write values.  Its hard-coded project ref is `efhiaufukjchxqhbmpvq`, and it refuses a mismatched `NEXT_PUBLIC_SUPABASE_URL`.

| Passport | English description | Chinese description |
| --- | --- | --- |
| DPP-GLR-LMT-000001 | A lightweight e-bike battery pack designed for urban commuting. | GLR-P25A 为城市通勤设计的轻型电助力单车电池包。 |
| DPP-GLR-LMT-000002 | A high-energy-density NMC battery pack for extended urban riding. | GLR-S36B 采用高能量密度 NMC 电芯，适用于城市长续航骑行。 |
| DPP-GLR-LMT-000003 | A high-load battery pack designed for cargo and fleet operations. | GLR-X48C 面向货运与车队运营的高负载电池包。 |
| DPP-DEMO-ESS-000001 | A 14.3 kWh LFP energy storage module for commercial and industrial applications. | GreenVault 工商业场景的 14.3 kWh 磷酸铁锂储能模块。 |
| DPP-DEMO-TEX-000001 | An organic cotton basic T-shirt made with comfortable 180 g/m² fabric. | EcoWeave 有机棉基础款 T 恤，采用 180 g/m² 舒适面料。 |
| DPP-DEMO-CE-000001 | Bluetooth wireless headphones with a recycled ABS enclosure. | LoopSound 采用再生 ABS 外壳的蓝牙无线耳机。 |
| DPP-DEMO-BLD-000001 | Wood-plastic composite flooring with 52% recycled content. | TerraDeck 再生材料含量 52% 的木塑复合地板。 |
| DPP-DEMO-HW-000001 | A precision alloy-steel tool set with replaceable bits. | ForgeFix 批头可更换的合金钢精密工具套装。 |

Hosted PreProd checks at `https://greanlean-dpp-preprod.vercel.app` returned HTTP 200 for `/demo?lang=zh` and `/demo?lang=en`.  The public catalog contained eight entries in the approved global `sort_order` sequence:

`DPP-GLR-LMT-000001`, `DPP-GLR-LMT-000002`, `DPP-GLR-LMT-000003`, `DPP-DEMO-ESS-000001`, `DPP-DEMO-TEX-000001`, `DPP-DEMO-CE-000001`, `DPP-DEMO-BLD-000001`, `DPP-DEMO-HW-000001`.

Hosted PreProd deployment: `dpl_3APBa7vZqSqFmdHd154xt4End3xr` (stable alias `https://greanlean-dpp-preprod.vercel.app`).  Post-deployment HTTP checks returned 200 for the homepage, both localized Demo pages, the public catalog API, all eight public DPP pages, and the LMT Resolver JSON endpoint.

## Production URL root-cause audit — read-only

The Production project identity was `lpxdbysgmdsjhxrjzhly`.  The public probes produced:

| Surface | Result | Root cause |
| --- | --- | --- |
| `/` | 200 | Existing V1 application remains available. |
| `/demo?lang=zh` | 404 | The Production deployment does not contain the Demo Showcase route; migration `0038` is also not applied. |
| `/p/DPP-GLR-LMT-000002?lang=zh` | 404 | The current Production application deployment does not contain the productized public-DPP route. |
| `/api/v2/resolver/DPP-GLR-LMT-000002?format=json` | 409 | The deployed Production Resolver cannot expose that V2 public identifier in its current schema/data/deployment state. |

This is a deployment-and-schema-state issue, not a `NEXT_PUBLIC_SITE_URL` mismatch.  The prior site URL correction evidence remains applicable: Production `NEXT_PUBLIC_SITE_URL` is configured for `https://www.greanlean.com`; the current public failures occur before a productized page can use that value.  Source review confirms that `app/p/[slug]/page.tsx` derives the Resolver host and public page URLs from `NEXT_PUBLIC_SITE_URL`, and the QR policy reads `QR_APPROVED_HOSTS` only as an explicit allowlist.

## Production environment remediation checklist

The Vercel target-environment inventory was read without retrieving values.  The following names are absent from Production compared with the PreProd project target; no Production setting was changed.

| Variable | Classification | Required remediation before a Production V2 promotion |
| --- | --- | --- |
| `DPP_ENVIRONMENT` | REQUIRED_PRODUCTION | Set to `production`; it suppresses PreProd-only diagnostics and guards target-specific scripts. |
| `FEATURE_V2_BMS_ADAPTER` | OPTIONAL_DISABLED_BY_DEFAULT | Keep disabled unless the approved BMS adapter surface is released. |
| `FEATURE_V2_CONNECTOR_EXECUTION` | OPTIONAL_DISABLED_BY_DEFAULT | Keep disabled; no connector execution is authorized. |
| `FEATURE_V2_EXTERNAL_CONNECTORS` | OPTIONAL_DISABLED_BY_DEFAULT | Keep disabled; no external connector activation is authorized. |
| `FEATURE_V2_FILE_IMPORT` | OPTIONAL_DISABLED_BY_DEFAULT | Keep disabled unless an approved tenant import workflow is released. |
| `FEATURE_V2_REGISTRY_TEST` | OPTIONAL_DISABLED_BY_DEFAULT | Keep disabled; Production Registry is not authorized. |
| `PREPROD_SUPABASE_PROJECT_REF` | PREPROD_ONLY_DO_NOT_ADD | Must never be added to Production. |
| `PUBLIC_RATE_LIMIT_BACKEND` | REQUIRED_PRODUCTION | Set to `supabase` after confirming the Phase 6C rate-limit RPC is present at the promoted migration head. |
| `QR_APPROVED_HOSTS` | REQUIRED_PRODUCTION | Set to the approved canonical host `www.greanlean.com` only; no wildcard, apex alias, or port variant. |

`NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2` is the one Production-only extra variable.  It is a legacy battery-DPP feature flag, still referenced by `lib/featureFlags.ts`; it is not a replacement for the V2 feature family and must remain disabled unless separately approved.

The Production promotion runbook has a complete name/value-source classification (`REQUIRED_PRODUCTION_ENV_UNRESOLVED = 0`), but the required settings are not applied.  This is not authorization to apply them.

## Migration 0036–0039 readiness — read-only

Production migration head is `0035`.  The prerequisite review found all ten required base tables and all four required helper functions for 0036, plus one eligible legacy platform administrator.  Production has eight product models and one V2 Organisation, satisfying the relationship-table FK preconditions for 0037.  The four migration file SHA-256 values are recorded in the evidence JSON.

| Migration | Readiness | Evidence / condition |
| --- | --- | --- |
| `0036_v2_platform_operator_multitenant` | GO | Ordered prerequisite `0035`, required base tables/functions, and the bounded legacy platform-admin bootstrap source were verified. |
| `0037_v2_product_organisation_relationships` | GO | Ordered prerequisite is explicit; the referenced Tenant, Product Model, SKU and Organisation tables exist. |
| `0038_v2_demo_showcase_catalog` | GO | Ordered prerequisite is explicit; it creates an empty catalog and does not seed or reinterpret Production product data. A separate approved catalog-data operation would still be required after migration. |
| `0039_round_d_security_operations_closeout` | GO_WITH_PRE_EXECUTION_EXPORT | Production `greanlean_0012_data_backup` exists with 23 rows and zero FK, view, or trigger consumers. Export/archive the 23-row rollback-aid snapshot immediately before executing its approved drop; do not treat the migration as a substitute for an archive. |

The `0039` migration is intentionally destructive only to that obsolete rollback-aid table.  Its readiness is conditional on the documented pre-execution archive, which is outside this Round E.1 authorization.

## Verification and release decision

- Added automated Round E.1 contract coverage for catalog-owned localized descriptions, global order, environment isolation/config contracts, ordered migration dependencies, and backup-consumer audit coverage.
- PreProd URL isolation: PASS — the updater is hard-pinned to PreProd and `PREPROD_SUPABASE_PROJECT_REF` remains a PreProd-only guard.
- Production URL simulation: PASS — a production-origin build uses the explicit `NEXT_PUBLIC_SITE_URL=https://www.greanlean.com` source path; it does not call or deploy Production.
- No Production public DPP returned HTTP 200 because the audited Production version lacks the V2 public route/data state.  This is recorded as an expected release blocker, not masked as a regression pass.
- Production GO/NO-GO: **NO-GO** until the owner authorizes and executes the separately scoped Production configuration, 0036–0039 migration sequence (including the 0039 archive), application deployment, and post-deployment V1/V2 regression proof.

## Hard boundaries

```text
PRODUCTION_DEPLOYED = NO
PRODUCTION_MIGRATIONS_EXECUTED = NO
PRODUCTION_DATA_WRITE_PERFORMED = NO
PRODUCTION_AUTH_CHANGED = NO
PRODUCTION_ENV_CHANGED = NO
OWNER_HUMAN_ACCEPTANCE = PENDING
```
