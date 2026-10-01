# Round H0 — Production 8-DPP data-source audit

Audit timestamp: `2026-10-01T13:46:56Z`

Scope: read-only trace of the eight public Production DPPs. No database,
application, environment, Auth, Tenant, cache, or deployment mutation was
performed.

## Result

`ROUND_H0_PRODUCTION_8DPP_DATA_SOURCE_AUDIT = PASS`

The eight DPPs currently visible at `https://www.greanlean.com` are present in
the Production V2 publication tables. They are not being supplied by a hidden
static DPP fixture or a fallback database. The former `approved=0 / legacy=22`
evidence is a valid pre-cutover snapshot that became stale when the authorised
Round G transaction committed the eight replacements and removed the 22 legacy
records.

## Production identity

- Domain: `https://www.greanlean.com`
- Supabase project ref: `lpxdbysgmdsjhxrjzhly`
- Migration head: `0039`
- Runtime proof: the deployed login bundle embeds
  `https://lpxdbysgmdsjhxrjzhly.supabase.co`; machine-resolver Passport IDs and
  payload hashes match the read-only results from that exact Supabase project.

## Public DPP trace

The canonical example `/p/DPP-GLR-LMT-000001` follows this path:

1. `app/p/[slug]/page.tsx` → `PublicDppPage` → `getV2Data`.
2. Feature gates `FEATURE_V2_RESOLVER` and `FEATURE_V2_PUBLIC_PROJECTION` must
   both be enabled.
3. `createSupabaseAdminClient()` reads `NEXT_PUBLIC_SUPABASE_URL` and uses the
   server-only service role key.
4. `resolvePublicPassport()` in `lib/server/v2/phase4Repository.ts` calls the
   service-role-only RPC `v2_phase6c_resolve_public_passport`.
5. The RPC validates `resolver_host_allowlist`, resolves
   `resolver_mapping` / `product_subject_identifier`, loads `dpp_passport`,
   follows `dpp_current_pointer`, and returns the current `dpp_version`.
6. The page takes `dpp_version.canonical_payload`, applies the PUBLIC audience
   projection, and renders `ProductizedDppPage`.

The same dynamic route, loader, RPC, Production environment, and table chain is
used by all eight approved identifiers.

`PUBLIC_DPP_PRIMARY_DATA_SOURCE = Production RPC v2_phase6c_resolve_public_passport -> dpp_version.canonical_payload`

`PUBLIC_DPP_DATA_SOURCE_UNIFIED = YES`

The legacy branch (`loadPublicDppData`, legacy snapshot RPCs, `products`, and
legacy child tables) is reachable only if V2 resolution returns no published V2
Passport. It was not taken for any of the approved eight. A V2 Passport that is
present but unresolved fails closed as `V2_UNRESOLVED` rather than falling back.

## Demo catalog trace

`app/demo/page.tsx` calls `loadPublicDemoShowcase()` from
`lib/server/v2/demoShowcase.ts`. That loader reads public synthetic rows from
`demo_showcase_entry`, then requires an ACTIVE `dpp_passport`, a
`dpp_current_pointer`, and a PUBLISHED `dpp_version`. `sort_order`, bilingual
titles/descriptions, brand, parameters, cover style, and featured state come
from `demo_showcase_entry`. There is no fallback catalog in this loader.

- `/demo` reads `demo_showcase_entry`: YES
- Static code provides layout, category labels, and formatting only: YES
- Static code provides the eight catalog records: NO
- Resolver mappings provide catalog cards: NO
- Fallback catalog used: NO

`DEMO_CATALOG_DATA_SOURCE = demo_showcase_entry joined to dpp_passport + dpp_current_pointer + PUBLISHED dpp_version`

## Human and machine resolver trace

`app/r/[identifier]/route.ts` does not query a resolver table. It constructs a
same-origin `/p/<encoded identifier>` URL from the route parameter, preserves
only `lang=zh|en`, and returns HTTP 302. Production samples for LMT, ESS, and
Textile redirected to the expected same-origin Passport URL.

`HUMAN_RESOLVER_DATA_SOURCE = app/r/[identifier]/route.ts route parameter + request origin (no database lookup)`

`app/api/v2/resolver/[identifier]/route.ts` requires the V2 public feature
flags, creates the Production admin client, and calls
`resolvePublicPassport()`. Its single database round trip uses
`v2_phase6c_resolve_public_passport`, whose tables are described above. There is
no static or legacy fallback. Production samples returned HTTP 200,
`X-DPP-Resolver-Query-Count: 1`, and Passport IDs/payload hashes identical to
the direct Production query.

`MACHINE_RESOLVER_DATA_SOURCE = v2_phase6c_resolve_public_passport RPC over resolver_mapping + product_subject_identifier + dpp_passport + dpp_current_pointer + dpp_version`

## Dashboard publications trace

`/dashboard/v2/publications` renders `BackofficeConsole`. The browser obtains
its Supabase session, calls `/api/v2/backoffice/context`, then calls
`/api/v2/backoffice/snapshot` with the access token and explicit `x-tenant-id`.
`requireV2PolicyContext` verifies authentication, Tenant context, feature gates,
and the PDP decision. `loadBackofficeSnapshot` then loads Tenant-filtered rows.

- Passport list: `dpp_passport WHERE tenant_id = verified tenant`
- Review/candidate state: `dpp_review_task WHERE tenant_id = verified tenant`
- Version/publication state: `dpp_version WHERE tenant_id = verified tenant`
- Current version: `dpp_current_pointer WHERE tenant_id = verified tenant`
- Published count: client filter `publication_state === 'PUBLISHED'`
- Candidate readiness: current published/withdrawn version first, then review
  status (`IN_REVIEW`, `APPROVED`, `REJECTED`, or `CHANGES_REQUESTED`)

`DASHBOARD_PUBLICATIONS_DATA_SOURCE = authenticated /api/v2/backoffice/snapshot -> Tenant-filtered dpp_passport + dpp_review_task + dpp_version + dpp_current_pointer`

## Direct Production counts

All counts were recalculated with read-only SQL against
`lpxdbysgmdsjhxrjzhly`:

| Source | Approved-eight rows |
| --- | ---: |
| `dpp_passport` | 8 |
| `resolver_mapping` | 8 |
| `demo_showcase_entry` | 8 |
| `dpp_current_pointer` | 8 |
| `dpp_version` | 8 |
| `dpp_review_task` | 8 |
| PUBLISHED `dpp_version` | 8 |
| ACTIVE DPP identifiers | 8 |

Each Passport is `ACTIVE`, `publication_source=V2`, version 1 is PUBLISHED,
its review is PUBLISHED, its `www.greanlean.com` resolver is ACTIVE/public, and
its catalog entry is public/demo/synthetic. The current total `dpp_passport`
count is 8 and the old `DPP-GLR-EBIKE-*` count is 0.

## Previous audit reconciliation

The former result came from the pre-cutover guard and post-ROLLBACK baseline in
`scripts/phase7/generate-round-g4-2-cutover.mjs`. It directly counted the two
identifier lists in `dpp_passport` and correctly observed 22 legacy / 0 approved
before the COMMIT script ran. `round-g4-2-cutover-dryrun-result.json` records
that transaction as `ROLLED_BACK`, so it is not post-cutover evidence.

The runtime now reads the same Production V2 Passport domain, plus the resolver
and current-publication joins, after the authorised Round G COMMIT. Therefore:

- `PREVIOUS_AUDIT_QUERY_SCOPE`: pre-cutover Production `dpp_passport` counts for
  the 22 legacy and eight approved identifier lists.
- `RUNTIME_QUERY_SCOPE`: post-cutover Production resolver RPC over mapping,
  identifier, Passport, pointer, and immutable PUBLISHED version; `/demo` adds
  the catalog join and dashboard adds Tenant-scoped review/version reads.
- `QUERY_SCOPE_MISMATCH = NO`
- Reason: the contradiction is temporal (pre-COMMIT evidence compared with
  post-COMMIT runtime), not a different Production project or hidden data layer.

## Static, fallback, and mixed-source findings

`APPROVED8_STATIC_FIXTURE_USAGE = YES`, with an important boundary: no static
fixture supplies the eight published DPP records. Static runtime involvement is
limited to:

- `components/v2/ProductizedDppPage.tsx`: presentation labels, neutral public
  wording transforms, and the Demo disclaimer.
- `app/api/demo-document/route.ts`: safe generated demonstration-document HTML
  for document filenames stored in the canonical payload.
- `components/v2/demo/HomepageDemoMix.tsx`: a static four-ID homepage selection;
  card records are still fetched from `/api/public/demo-showcase`.
- `app/page.tsx`: dormant/static marketing-case copy and identifiers.
- `lib/server/dppShowcase.ts` and `lib/server/batteryShowcaseData.ts`: legacy
  showcase helpers containing some approved IDs, but bypassed when the V2
  resolver succeeds for these eight.

`APPROVED8_FALLBACK_USAGE = NO`

`PUBLIC_DPP_MIXED_SOURCE = YES` because the published business values come from
one immutable database payload while the presentation shell, wording
normalisation, disclaimer, and generated document viewer are code-owned.

Representative section map (LMT, ESS, and Textile):

| Section | Runtime source |
| --- | --- |
| Overview | `dpp_version.canonical_payload` fields, especially `identity.product`, `technical.specification`, and `performance.durability` |
| Identifiers | `dpp_passport.passport_identifier` plus canonical `identity.item` |
| Carbon | canonical `sustainability.carbon-footprint` |
| Lifecycle | canonical `lifecycle.events` |
| Documents | canonical `documents.public` metadata; generated viewer HTML from `app/api/demo-document/route.ts` |
| BMS | canonical `bms.snapshot` for LMT; no static BMS fallback; ESS uses canonical durability data and Textile has no BMS field |
| Footer/disclaimer | static localized copy in `ProductizedDppPage.tsx` |

## Environment and decision

- `PUBLIC_RUNTIME_USES_PRODUCTION_PROJECT = PASS`
- `DASHBOARD_RUNTIME_USES_PRODUCTION_PROJECT = PASS`
- `RESOLVER_RUNTIME_USES_PRODUCTION_PROJECT = PASS`
- `CHECKLIST_RUNTIME_RECONCILIATION = PASS`
- `DATABASE_CUTOVER_REQUIRED = NO`
- `G4_2_RECOMMENDATION = CANCEL`

G4.2 must not be rerun: the target state it was designed to create already
exists, its collision guards would correctly reject the operation, and rerunning
it would risk duplicating or replacing the current publication graph.

## Mutation invariant

`PRODUCTION_MUTATION_PERFORMED = NO`

`PRODUCTION_APPLICATION_DEPLOYED = NO`

