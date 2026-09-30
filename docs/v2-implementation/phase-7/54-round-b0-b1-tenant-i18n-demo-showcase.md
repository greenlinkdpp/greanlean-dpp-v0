# Round B0 / B1 — Tenant validation, Chinese localisation, and Demo Showcase

## Scope and environment

- Environment: `greanlean-dpp-preprod` only (`efhiaufukjchxqhbmpvq`)
- Production database writes: **NO**
- Production traffic changes: **NO**
- PreProd migration head: `0038`
- Deployment: `dpl_Wqkq7ebyYapmW1bHWkH7as5Bu34b`
- PreProd URL: `https://greanlean-dpp-preprod.vercel.app`

## B0 result

The platform Tenant code contract is enforced before database insertion and database constraint failures are translated to deterministic API errors. The platform and backoffice surfaces have Chinese operational labels.

`B0-1_BROWSER_CREATE_EDIT_DELETE = WAIVED_BY_OWNER`

The owner explicitly waived the manual browser acceptance step while away from the computer. This is not represented as a browser-acceptance PASS.

`B0-2_CHINESE_LOCALISATION = IMPLEMENTED`

The residual `public.greanlean_0012_data_backup` table remains documented as `LIKELY_UNUSED_BACKUP_TABLE`; it was not changed or dropped.

## B1 implementation

Migration `0038_v2_demo_showcase_catalog` adds a tenant-scoped, RLS-protected Demo Showcase catalog and two explicit Platform Operator capabilities:

- `platform.demo.view`
- `platform.demo.manage`

The public catalog exposes only entries marked `is_public`, `is_demo`, and `synthetic`. Its server projection deliberately omits tenant, author, workflow, and unpublished-version data. Platform management is available at `/dashboard/platform/demos`; public discovery is available at `/demo?lang=zh` and `/demo?lang=en`.

The public V2 DPP treatment uses a small synthetic-demo badge in the header. It preserves the underlying synthetic/provenance data while removing the former large warning banner.

## Seeded PreProd catalog

| Category | Public DPP |
| --- | --- |
| LMT battery | `DPP-GLR-LMT-000001`, `DPP-GLR-LMT-000002`, `DPP-GLR-LMT-000003` |
| Industrial battery | `DPP-DEMO-ESS-000001` |
| Textile | `DPP-DEMO-TEX-000001` |
| Consumer electronics | `DPP-DEMO-CE-000001` |
| Building material | `DPP-DEMO-BLD-000001` |
| Hardware | `DPP-DEMO-HW-000001` |

All eight records are deterministic synthetic PreProd fixtures. The non-battery categories use separate generic schemas and have no `bms.snapshot` field or BMS supplier relation. The three LMT cases carry the agreed deterministic BMS snapshots:

| DPP | SOC | SOH | Voltage | Current | Temperature | Cycles | State |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `DPP-GLR-LMT-000001` | 78% | 96% | 27.4 V | -2.8 A | 29.6 °C | 124 | Discharging |
| `DPP-GLR-LMT-000002` | 64% | 94% | 38.9 V | -4.1 A | 31.2 °C | 212 | Discharging |
| `DPP-GLR-LMT-000003` | 86% | 98% | 52.7 V | +3.1 A | 27.8 °C | 76 | Charging |

## Verification

- `pnpm lint`: PASS
- `pnpm typecheck`: PASS
- `pnpm test:migrations`: PASS (58 tests)
- `pnpm build`: PASS
- migration `0038` apply and RLS/capability verification: PASS
- catalog count: 8 public synthetic entries, PASS
- PreProd tenant count: 1, PASS
- PreProd Auth user count: 2, PASS
- local production-build smoke: `/demo?lang=zh` returned HTTP 200, PASS
- external public Resolver smoke: `NETWORK_ENVIRONMENT_UNVERIFIED` (the current execution environment timed out while reaching the Vercel public endpoint; Vercel deployment itself is Ready). This is not claimed as a Resolver PASS.

## Boundary

No Production data, migration, deployment, traffic, Registry, connector, QR, or V1 behavior was changed.
