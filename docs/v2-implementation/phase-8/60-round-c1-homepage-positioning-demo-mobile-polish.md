# Round C.1 — Homepage Positioning, Demo Mix and Mobile Polish

Date: 2026-09-30  
Environment: PreProd only — `greanlean-dpp-preprod` (`efhiaufukjchxqhbmpvq`)  
Deployment: `dpl_4EpDqLQZaaYScePFtHt9YAfZWFXL`

## Delivered

- Repositioned the bilingual homepage as a general Digital Product Passport platform with Battery Passport as the explicitly featured solution.
- Removed repeated Battery Passport navigation entries; Chinese and English headers now expose one solution, one Battery Passport, implementation, Demo, sign-in and language control.
- Replaced the homepage's static product-card data with a public, shaped runtime catalog projection. The configured selection is exactly one LMT battery (`DPP-GLR-LMT-000002`), one ESS, one textile and one consumer-electronics passport.
- Added the compact bilingual “View All Demos” navigation action.
- Preserved the existing mobile-first card grid, hamburger navigation, contained horizontal timeline scrolling, language-preserving links, and public-DPP return-to-home behavior.

## Verification

`pnpm lint`, `pnpm typecheck`, `pnpm test` (259 passing), `pnpm test:migrations` (58 passing), and `pnpm build` passed on the exact release tree.

Hosted PreProd returned HTTP 200 for homepage zh/en, Demo, login, and all four specified DPP pages. The new public catalog endpoint returned all four configured published entries. The prior eight public Resolver JSON endpoints remain covered by the Round C regression evidence.

Mobile styles use a single-column default card layout, accessible hamburger control, wrapping CTA layout and contained timeline overflow. Browser-driven physical-device interaction remains an Owner review item.

## Boundaries

- `KNOWN_TENANT_DELETE_ISSUE = OPEN`
- `RLS_SECURITY_BLOCKER_REMAINS = YES`
- `RLS_WARNING_TABLE = public.greanlean_0012_data_backup`
- No Production deployment, data write, authentication change, migration, traffic switch, Registry action or connector activation occurred.
