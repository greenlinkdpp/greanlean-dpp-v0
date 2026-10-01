# Round E — Production Promotion Plan & Release Gate

## Decision

**PRODUCTION_GO_NO_GO: NO-GO.** This Round completed the release plan and read-only gate; it did not deploy, migrate, write data, modify Auth, mutate environment variables, or switch traffic in Production.

The live Production baseline prevents promotion today: its database head is `0035` while PreProd is `0039`; it lacks the `demo_showcase_entry` catalog; and read-only public probes found `/demo` = 404, `/p/DPP-GLR-LMT-000002` = 404, and the corresponding resolver JSON = 409. Production also lacks nine PreProd Production-target variable names. These are release blockers, not items to work around during this Round.

## Environment identities

| Environment | Supabase | Vercel project/environment | Domain |
| --- | --- | --- | --- |
| Hosted PreProd | `efhiaufukjchxqhbmpvq` | `greanlean-dpp-preprod` / Production target | `https://greanlean-dpp-preprod.vercel.app` |
| Production | `lpxdbysgmdsjhxrjzhly` | `greanlean-dpp-v0` / Production | `https://www.greanlean.com` |

## Demo ordering change — PreProd only

The public catalog previously sorted first by alphabetical `category_code`, not its intentional product presentation order. The implementation now uses global `sort_order`, with `id` only as a stable tie-breaker. Existing PreProd entries were updated without duplicate data:

1. `DPP-GLR-LMT-000001`
2. `DPP-GLR-LMT-000002`
3. `DPP-GLR-LMT-000003`
4. `DPP-DEMO-ESS-000001`
5. `DPP-DEMO-TEX-000001`
6. `DPP-DEMO-CE-000001`
7. `DPP-DEMO-BLD-000001`
8. `DPP-DEMO-HW-000001`

`/demo?lang=zh` and `/demo?lang=en` return 200, and the shared public endpoint returned the same eight-entry order. Homepage's separate four-card projection is unchanged.

## Production read-only baseline

| Check | Result |
| --- | --- |
| Migration head | `0035` |
| Public base tables | 150 |
| RLS-disabled public tables | 0 |
| Broad `USING (true)` / `WITH CHECK (true)` policies | 0 |
| Auth users | 5 |
| Tenants | 2: `greanlean-reference-mobility`, `soodoo-e-bike`, both ACTIVE |
| Organisation records / orphan organisations | 1 / 0 |
| Tenant memberships / orphan memberships | 3 ACTIVE / 0 |
| Product models / DPP passports / published versions / resolver mappings | 8 / 22 / 22 / 22 |
| Lead table | present (2 rows) |
| Demo catalog | absent |

The read-only RLS, Auth, Tenant and service-role source-boundary audits passed. This does not override the route, migration and environment blockers listed above.

## Pending Production migrations

| Migration | Purpose and impact | Data/security impact | Reversal / risk |
| --- | --- | --- | --- |
| 0036 | Platform operator capability, assignment and append-only audit | Adds platform IAM and RLS-protected audit tables; derives eligible legacy platform operators | paired rollback; medium risk: authority/RLS lockout |
| 0037 | Product Model/SKU ↔ Organisation responsibilities | Adds tenant-scoped relationship table, FK constraints and RLS policies; no legacy-row rewrite | paired rollback; medium risk: FK/data compatibility |
| 0038 | Public synthetic Demo catalog | Adds RLS-protected catalog and capabilities; data seeding is a separately approved operation | paired rollback; medium risk: public catalog/route completeness |
| 0039 | Round D security closeout | Drops unused 0012 public backup table and adds a service-role-only archived-empty Tenant delete function | paired rollback recreates empty protected backup table; medium risk: historical rollback snapshot is intentionally not recreated |

## Future execution and rollback plan (not executed)

T-24h: freeze non-blocker changes; capture Production schema/table/RLS/auth/tenant/public-route baseline; confirm a completed managed backup, timestamp and rollback point; export agreed critical table fingerprints; retain the current Vercel deployment.

T-1h: confirm owners/support window; re-run the exact RC suite in PreProd; compare migration checksums; confirm Production environment variable names and target assignment; verify no PreProd or localhost public URL leak.

T-15m: repeat backup freshness, V1 smoke, resolver/QR baseline and Auth availability checks; obtain explicit owner promotion approval.

Deploy: apply each approved migration serially with ledger verification and targeted schema/RLS checks; seed only the approved eight synthetic Demo records; deploy the approved application RC; do not enable Registry/connectors unless separately approved.

Post-deploy +5m: homepage zh/en, login, catalog order, eight public DPPs, QR/resolver, document links, LMT BMS trends, Platform Console and Tenant Workspace. A test Lead, if separately authorized, must use `TEST PRODUCTION`, record its ID, and be removed by exact ID.

+30m/+24h: review server errors, resolver/lead failures, latency and security/audit signals. Stop promotion on a V1 regression, route/QR failure, RLS anomaly, Auth/Storage failure, migration-count mismatch, or material error/latency issue.

Application rollback restores the retained Production Vercel alias. Database rollback uses the paired migration only when its stated preconditions hold; otherwise use a forward fix. A database restore is a separately authorized recovery action, not an automatic application rollback. The Pilot backup baseline is managed daily physical backups, RPO up to 24 hours, proposed RTO 60 minutes, PITR disabled.

## Promotion data policy

**Keep if separately approved:** the eight public synthetic Demo DPPs, their published versions/current pointers/resolver mappings, synthetic disclaimers and approved public assets.

**Never promote:** `TEST PREPROD Lead`, any `test` / `test001` tenant, QA/debug fixtures, temporary test-auth users, temporary data, and PreProd-only configuration. Synthetic public Demo data is not QA data and must retain its synthetic/disclaimer boundary.

## Remaining risks

| Risk | Likelihood | Impact | Mitigation / rollback | Owner |
| --- | --- | --- | --- | --- |
| Production migration failure or RLS lockout | Medium | High | serial migration checks; stop and paired rollback/forward fix | Platform Owner |
| Wrong environment or missing variables | High | High | explicit name/target diff and identity check; no deploy until closed | Platform Owner |
| Resolver/QR points to unavailable route | High | High | route/QR smoke before and after; restore Vercel alias | Platform Owner |
| Demo duplication or QA-data promotion | Medium | Medium | explicit keep/exclude manifest and count checks | Platform Owner |
| Lead write or document-asset failure | Medium | Medium | exact Lead and asset smoke; application rollback | Platform Owner |

## Gate evidence

PreProd deployment `dpl_7cPAbfbWCFBJ2FjQj3n9LoDo2uqD` is Ready. It passed homepage zh/en, demo zh/en, the exact eight public DPP routes, QR redirect and resolver JSON checks. The final lint, typecheck, test, migration-test and build gate is recorded in the accompanying JSON evidence.

Owner human acceptance remains **PENDING**. Do not deploy Production.
