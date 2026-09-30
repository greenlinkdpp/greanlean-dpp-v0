# Round B2.2 — Demo localization, category semantics and data differentiation

Date: 2026-09-30  
Environment: `greanlean-dpp-preprod` (`efhiaufukjchxqhbmpvq`) only  
Stable URL: `https://greanlean-dpp-preprod.vercel.app`  
Deployment: `dpl_CRUJcpxhYRh4xqZJiNdLagSGyjbP` (`READY`)

## Result

`ROUND_B2_2_DEMO_POLISH = PASS`

The Round B2.2 scope was limited to Demo localization, category semantics, data differentiation, units and localized titles. QR/Resolver architecture, object rendering, Auth, Tenant isolation, backoffice CRUD and Production were not changed.

## Localization and units

- Hosted visible-text scans removed script/RSC payloads before evaluating visible UI text.
- `/demo?lang=zh` plus all eight Chinese DPP pages returned `ZH_ENGLISH_RESIDUAL_COUNT = 0` for the specified forbidden labels, enums and values.
- `[object Object]` and `2,026` remained `0` on all nine routes.
- Demo-card units were verified for `V`, `Ah`, `kWh`, `g/m²`, `mm` and `%`; the required examples render as `14.3 kWh`, `180 g/m²`, `140 × 25 × 2200 mm` and `52%`.
- Chinese Demo title: `GreanLean 数字产品护照演示展厅`.
- Chinese public DPP title pattern: `<中文产品名> - GreanLean DPP`.
- Proper legal names, brand names, model codes, URLs and the explicitly allowed technical acronyms were excluded from the residual definition.

## Category semantics

The textile, consumer-electronics, building-material and hardware payloads now carry category-specific transport, repair/maintenance, end-of-life and lifecycle text. Their current recycler relationships are exactly:

| Category | Recycler |
| --- | --- |
| Textile | EcoWeave Textile Recycling Partner |
| Consumer electronics | LoopSound Electronics Recovery Partner |
| Building material | TerraDeck Materials Recovery Partner |
| Hardware | ForgeFix Metal Recycling Partner |

A read-only payload scan found no battery-only organisation, materials, recycled-content or compliance keys in those four non-battery category payloads. The consumer-electronics WEEE text retains the expressly approved conditional removable-battery instruction.

## Differentiation

The three LMT carbon profiles match the approved values and component sums:

| DPP | Total kg CO₂e | Materials | Manufacturing | Transport | Packaging | Other | Renewable electricity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DPP-GLR-LMT-000001 | 31.8 | 16.5 | 8.2 | 4.0 | 1.6 | 1.5 | 34% |
| DPP-GLR-LMT-000002 | 48.6 | 26.1 | 12.7 | 5.4 | 2.2 | 2.2 | 42% |
| DPP-GLR-LMT-000003 | 62.4 | 34.8 | 15.4 | 6.5 | 2.8 | 2.9 | 47% |

Renewable-energy values across all eight pages are distinct: `34`, `42`, `47`, `55`, `61`, `46`, `52`, and `39` percent. Lifecycle event-name sequences are distinct across all eight DPPs and remain chronological.

## Hosted regressions

- Public DPP HTTP 200: `8/8`.
- QR image endpoint HTTP 200: `8/8`.
- Human resolver redirect to the matching localized public DPP: `8/8`.
- BMS trend labels remained visible on LMT pages.
- Document viewer links remained visible.
- QR text remained `扫码查看数字产品护照`.
- Known Tenant delete issue: `OPEN`; tenant deletion was not touched.
- Existing RLS warning remains `public.greanlean_0012_data_backup` / `rls_disabled_in_public`.

## Verification and boundary

- Targeted Round B2.2 tests: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS.
- `pnpm test:migrations`: PASS.
- `pnpm build`: PASS.
- Production deployment: **NO**.
- Production data write: **NO**.
- Production Auth change: **NO**.

STOP after Round B2.2. Homepage Round C was not started. Owner human review remains the next action.
