# Round C — Homepage Product Experience Integration

Date: 2026-09-30  
Environment: `greanlean-dpp-preprod` only (`efhiaufukjchxqhbmpvq`)  
Deployment: `dpl_ANC8i3EGbZrMpWP21XYiYMvGJg4z`

## Delivered

- Repositioned the public homepage around Battery Passport, with the approved bilingual hero and consistent Demo, implementation-process and login calls to action.
- Made `/demo` the public primary Demo entry rather than a single legacy passport link.
- Foregrounded the three published LMT examples and one industrial-energy example on the homepage; the later industry section now describes extension capability, not equal commercial readiness.
- Kept the existing public Demo catalog and public-DPP routes as the source of published product data; homepage cards are a deliberately narrow display projection.
- Aligned public header links, Demo-to-home, language routes, and login routes.
- Corrected the public-DPP wordmark to return to the same localized Homepage.
- Applied the ESS `7.2 kW` / Chinese `0°C 至 45°C`, building-material `mm`, and Chinese Bluetooth display corrections through the shared seed and presentation paths.
- Added targeted Round C contract tests. No migration was added or changed.

## Verification

The exact code tree passed `pnpm lint`, `pnpm typecheck`, `pnpm test` (259 passing), `pnpm test:migrations` (58 passing), and `pnpm build`.

Hosted PreProd HTTP checks returned `200` for homepage zh/en, Demo zh, login, LMT, ESS, Building Material and Consumer Electronics public-DPP routes. All eight published Demo Resolver JSON routes returned `200`.

The hosted HTML contains the Chinese battery-first hero, CTA labels, and the four intended Demo-card labels. Query-string locale preservation is covered by the client language switcher and automated source/route tests. A browser-driven responsive visual review was not available in this execution environment, so it is not represented as an automated PASS.

## Boundaries and carryover

- `KNOWN_TENANT_DELETE_ISSUE = OPEN`
- `RLS_SECURITY_BLOCKER_REMAINS = YES`
- `RLS_WARNING_TABLE = public.greanlean_0012_data_backup`
- Production was not deployed, written, reconfigured, or switched.
- No Production migration, Registry activation, connector activation, or QR/resolver behavior change was performed.

## Human review required

Review the hosted PreProd site at `https://greanlean-dpp-preprod.vercel.app/?lang=zh` and `?lang=en` at desktop, tablet, and mobile widths. Confirm header collapse, hero CTA spacing, card stacking, language rendering, and the product experience visually before any later promotion decision.
