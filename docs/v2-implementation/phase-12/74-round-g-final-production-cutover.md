# Round G final Production data cutover

The operation-equivalent COMMIT script from the passing dry-run was executed
against Production.

- Legacy DPPs after cutover: 0
- Approved Demo DPPs: 8
- Approved Production resolver mappings: 8
- Demo Showcase entries: 8
- Total DPPs: 8
- Auth users: 5 (unchanged)
- Tenants: 2 (unchanged)
- Disabled publication/version user triggers after transaction: 0

The application validation suite passed before Production deployment.

## Final application release

- Release commit: `669212d6dee0fec37a6294eed318f29f8142046e`
- Release tree: `b1e6bfc1592626c982559a499dff7d99c4abdd2a`
- Production deployment: `dpl_3vvBj9RELNrcMrRZXCVinaaf4AYp`
- Production origin: `https://www.greanlean.com`
- Deployment state: `READY`
- Production migration head: `0039` (unchanged by application deployment)

The exact release tree passed `pnpm lint`, `pnpm typecheck`, `pnpm test`
(267/267), `pnpm test:migrations` (58/58), and `pnpm build` before deployment.

## Post-deployment verification

- Homepage, login, and bilingual Demo catalog: PASS
- Eight bilingual public DPP pages: PASS
- Eight human Resolver redirects: PASS
- Eight machine-readable Resolver projections: PASS
- Eight Production QR images: PASS
- Catalog cardinality and order: PASS
- Public-copy scan for internal/demo implementation phrases: PASS (zero hits)
- CSP, `X-Content-Type-Options`, and Referrer Policy headers: PASS
- Production RLS audit: PASS (zero RLS-disabled public tables; zero broad policies)
- Production relationship audit: PASS (zero orphan organisations/memberships)

`ROUND_G_PRODUCTION_CUTOVER = PASS`
