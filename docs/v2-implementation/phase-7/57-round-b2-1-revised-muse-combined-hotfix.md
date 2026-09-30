# Round B2.1 — Revised Muse combined hotfix

Date: 2026-09-30  
Environment: `greanlean-dpp-preprod` (`efhiaufukjchxqhbmpvq`) only  
Hosted URL: `https://greanlean-dpp-preprod.vercel.app`  
Deployment: `dpl_HYJoWpr3sGvESx38JNdUiLA5twTZ` (Ready)  
Release commits: `5670313`, `4cd9011`, `08fa4e0`

## Implemented remediation

- Root cause of the visible `[object Object]` defect: bilingual `{ en, zh }` values were being coerced with `String(...)` in the V2 metadata path; generic field renderers also needed a locale-aware scalar boundary.
- `formatValue` is now used for the V2 page title and description. The hero, documents, timeline and structured field renderers use the same localized-value boundary.
- Chinese labels were completed for the demo payload fields, carbon-breakdown keys, document categories and time units. The Chinese QR instruction is now `扫码查看数字产品护照`.
- Non-battery synthetic payloads were reseeded with battery-only organisation, materials, compliance and recycled-content fields removed. Their recycler is category-specific.
- QR generation now uses the human route `/r/<DPP-ID>`; that route returns a 302 redirect to the localized public page. The machine endpoint remains `/api/v2/resolver/<DPP-ID>` and returns JSON.

## Read-only data verification

- Public synthetic demo entries: `8`.
- Tenant count: `2`; the known tenant-delete issue remains `OPEN` and was not modified.
- The four non-battery payloads contain `0` matches for battery-only fields (`pack_assembler`, `cell_supplier`, `bms_supplier`, electrode/electrolyte fields, battery recycling percentages, `UN38.3`, or IEC battery references).
- Carbon totals are differentiated: LMT `42.6`, industrial battery `312`, textile `5.2`, consumer electronics `11.8`, building material `8.4`, hardware `3.1` kg CO₂e.
- Current non-battery document/lifecycle counts are `4` and `10`; LMT counts are `10` and `10`.
- Eight canonical hosted PreProd resolver paths exist. A ninth hosted historical LMT alias (`/p/DPP-GLR-EBIKE-000001`) is retained for backward compatibility and is not a Demo card. Historical `localhost` database mappings were retained as non-displayed resolver history; no hosted public page, QR target, or human resolver output contains `localhost`.

## Hosted route verification

The matrix in `evidence/round-b2-1-revised-browser-matrix.json` records the eight public public-page routes, QR endpoints and human resolver redirects. Each public page was fetched from the stable Hosted PreProd alias and its server-rendered response was scanned.

- 8/8 public DPP pages returned HTTP 200.
- 8/8 QR endpoints returned HTTP 200.
- 8/8 human resolver routes returned the expected 302 `Location` to `/p/<DPP-ID>?lang=zh`.
- The machine resolver returned HTTP 200 JSON for `DPP-DEMO-TEX-000001`.
- `[object Object]`, `2,026`, and `localhost` occurrence counts were each `0` across all eight fetched public page responses.
- The localized `<title>` values were verified for a textile and LMT page after the metadata correction.

Desktop interactive-browser control could not create a tab because its computer-use session timed out and reset. The recorded route/HTML checks are therefore automated hosted-rendering evidence, not a replacement for optional owner visual acceptance.

## Regression and boundaries

- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm test`: PASS (252 tests)
- `pnpm test:migrations`: PASS (58 tests)
- `pnpm build`: PASS
- No credentials were found by the targeted repository scan; its only matches were UI labels, test fixtures, or generated-at-runtime script values.
- The existing RLS warning remains `public.greanlean_0012_data_backup` / `rls_disabled_in_public`; it was not changed.
- Production deployment, data writes, Auth changes, migrations, traffic switching and QR behavior changes: **NO**.

## Result

`ROUND_B2_1_REVISED = PASS` for the automated PreProd scope. No Production action was performed.
