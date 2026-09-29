# Platform Console Round 1 — PreProd Verification

Date: 2026-09-29  
Environment: isolated PreProd project `greanlean-dpp-preprod` (`efhiaufukjchxqhbmpvq`)  
Architecture baseline: **v2.1**  
Result: **PASS**

## Release and safety boundary

| Item | Result |
|---|---|
| PreProd deployment | `dpl_ECtqDJxGR4QCUHjxTLpt8ggqcmeM` |
| PreProd production target | `https://greanlean-dpp-preprod.vercel.app` |
| Migration head | `0036` (existing verified PreProd state) |
| Production code/data changed | **NO** |
| Production traffic switched | **NO** |
| Production migration applied | **NO** |
| Production Registry/connectors enabled | **NO** |
| Round 2 work started | **NO** |

The Vercel `production` target named above is the isolated `greanlean-dpp-preprod` project, not the GreanLean Production project. No `--prod` deployment was performed against the Production project.

## Round 1 acceptance evidence

- Platform Admin uses the existing `PLATFORM_ASSIGNMENT_ONLY` authority model. No Tenant membership was created.
- Platform Overview loads real PreProd data with 5 active Tenants, 32 Product Models, 51 DPP Passports, and 0 failed/quarantined imports.
- The Tenant selector starts at the empty option `Select a Tenant`; there is no Reference Tenant or first-row fallback.
- Each Tenant row exposes an explicit `tenant` code entry link. The SOODOO row is `SOODOO E-bike · soodoo-e-bike` with 1 model and 3 DPP Passports.
- `/dashboard/v2?lang=en` without a Tenant query renders `Active Tenant required` and does not fetch a Tenant snapshot.
- `/dashboard/v2?tenant=soodoo-e-bike&lang=zh` renders `当前租户: SOODOO E-bike · Platform Operator` and the 3 published synthetic DPPs.
- Browser QA passed at desktop English, desktop Chinese, and 390×844 mobile Chinese viewports. The captured mobile view shows the scope selector, KPI cards, Tenant progress table, and explicit entry actions.
- The official wordmark was verified by SHA-256 and rendered with `object-contain`; no destructive asset crop or generated replacement was introduced.

Reference data integrity remained unchanged: 8 Models, 22 SKUs, 22 Individuals, 374 Claims, 22 Passports, 22 Versions, 22 Current Pointers, 22 Resolver Mappings, and 22 BMS Snapshots; duplicate DPP IDs, cross-Tenant business-row movement, and immutable-version mutation were all zero/false. Existing V1 and public Reference DPP regression remained PASS.

The final full regression was PASS: 247 unit/integration tests, 57 migration tests, lint, typecheck, and production build. Targeted Round 1 contracts were also PASS.

## Required non-goals

Manual DPP authoring, import/mapping/review redesign, Tenant membership redesign, Production V2 migration, Production traffic cutover, Registry enablement, and external connector activation remain outside Round 1.

Evidence JSON: `docs/v2-implementation/phase-7/evidence/platform-console-round1-preprod.json`.
