# Phase 7 — New Production Release Candidate

Generated: `2026-09-28T05:22:36Z`

## Result

```text
NEW_PRODUCTION_RC_FROZEN = TRUE
RC_SOURCE_MATCHES_VERIFIED_PREPROD = TRUE
RC_REPRODUCIBLE = TRUE
```

The new Production RC is an immutable Git reference to the exact application tree that produced the accepted Productized V2 Hosted PreProd UI. The later historical QA-document commit is intentionally not part of the RC tree; its diff from the candidate contains only seven files below `docs/v2-implementation/frontend/` and no application, runtime, configuration, migration or test source.

| Field | Frozen value |
|---|---|
| RC reference | `codex/phase7-v2-productized-ui-rc` |
| RC/source commit | `0909c9d51205604b7cdf896b7de3d4bc440f4680` |
| RC/source tree | `bee3bb947ba84668a4b079adcf171026329aa81c` |
| Tracked files | 867 |
| Migration head | `0035` |
| Migration files | 30 |
| Migration checksum manifest SHA-256 | `6e34ca7a9b274ccf4cc92881453e0a6a3ccd69b53544fadeba86b7339caa76ab` |
| Production build ID | `Jh7WCWCCbbIdoCGFC9C7D` |
| Verified PreProd deployment | `dpl_BPdJ6q9CwgypiqR14zgbZqSYbmQY` |
| Verified PreProd alias | `https://greanlean-dpp-preprod.vercel.app` |

The invalid historical RC `907f86f1c57cc5957af974048e4539cf54877284` was not reused or changed.

## Exact-candidate verification

The suite was run in a detached clean worktree at the RC commit:

| Check | Result |
|---|---|
| Lint | PASS |
| Typecheck | PASS |
| Unit tests | 118/118 PASS |
| Integration tests | 95/95 PASS |
| Migration tests | 56/56 PASS |
| Production build | PASS |
| Credential scan | PASS; 867 tracked files and 7 credential values compared, 0 matches |
| Debug/TODO/temporary marker scan | PASS; 0 application-source matches |
| Generated-artifact exclusion | PASS |
| Environment-file exclusion | PASS; only `.env.example` is tracked |
| Candidate working tree after verification | clean |

Local environment files, `.next`, `.vercel`, Supabase temporary metadata, coverage and test output are not in the RC tree. The complete per-migration checksum set is recorded in `evidence/new-production-rc.json`.

## Hosted PreProd revalidation

All three Synthetic Demo passports returned HTTP 200 for the product page, public JSON, public HTML and QR. The Productized renderer, visible Synthetic/Unverified warnings and language control remained active. Stable IDs, current version `1`, immutable payload hashes, approved QR targets and the legacy alias were unchanged.

Security revalidation found no restricted BMS, supplier or document values in public HTML, hydration data or public JSON; no false “retained and verified” text; unsigned audience spoofing remained public; and an arbitrary QR `target` was ignored. Responsive checks at widths 375, 390, 430, 768, 1024 and 1440 had no horizontal overflow. Withdraw/tombstone behavior remains covered by the passing contract suite; no live Demo passport is withdrawn.

```text
PREPROD_REVERIFY = PASS
PUBLIC_DATA_LEAKAGE = NONE
UNVERIFIED_FALSE_VERIFIED_TEXT = NONE
CLIENT_BUNDLE_SECRET_MATCHES = 0
PUBLIC_ROLE_SPOOF = REMAINS PUBLIC
ARBITRARY_QR_TARGET = DISALLOWED
```

## Boundaries and limitations

- Hosted PreProd data is `SYNTHETIC_DEMO`, not verified customer business data.
- Production contains no SOODOO Model, Item, Passport or identifier rows.
- Real SOODOO Pilot data selection and reconciliation therefore remain pending.
- The RC freeze created only a Git branch reference. It did not deploy an application, write Production data, switch traffic, submit to Registry, activate connectors or enter Phase 8.

