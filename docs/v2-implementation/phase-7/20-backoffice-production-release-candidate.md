# Phase 7 — Backoffice Production Release Candidate

Generated: `2026-09-28T11:56:18Z`

## Result

```text
NEW_BACKOFFICE_PRODUCTION_RC_FROZEN = TRUE
RC_SOURCE_MATCHES_ACCEPTED_PREPROD = TRUE
RC_REPRODUCIBLE = TRUE
```

The new Backoffice-inclusive Production RC is a dedicated immutable Git reference to the exact application source accepted in Hosted PreProd. It does not reuse or overwrite the earlier Productized UI RC.

| Field | Frozen value |
|---|---|
| RC reference | `codex/phase7-v2-backoffice-rc` |
| Source / RC commit | `4c0aa4a306fc7f62a57e374d07f57f55e84fbda0` |
| Source / RC tree | `cc17d8ceeb012774ce6435b68baf5dbcb79aea38` |
| Tracked files | 897 |
| Migration head | `0035` |
| Migration files | 30 |
| Migration checksum manifest SHA-256 | `6e34ca7a9b274ccf4cc92881453e0a6a3ccd69b53544fadeba86b7339caa76ab` |
| Verification production build ID | `Ru6dqW55LAaapcO9VAZIM` |
| Accepted PreProd deployment | `dpl_FaKXuihKgJm8eJw1vQR8nv9Fj4na` |
| Accepted PreProd alias | `https://greanlean-dpp-preprod.vercel.app` |
| Accepted PreProd Supabase project | `efhiaufukjchxqhbmpvq` |

The repository HEAD after the accepted source contained only two later QA-evidence changes under `docs/v2-implementation/backoffice/`. The complete diff from `4c0aa4a` to the pre-freeze working HEAD contained no application, runtime, configuration, migration or test change. Those documentation-only changes are intentionally excluded from the RC tree.

## Exact-source verification

The candidate was checked out detached at `4c0aa4a` in an isolated worktree, installed from the lockfile, verified, and left clean.

| Check | Result |
|---|---|
| Typecheck | PASS |
| Lint / repository hygiene | PASS |
| Unit tests | 122/122 PASS |
| Integration tests | 101/101 PASS |
| Combined application suite | 223/223 PASS |
| Migration tests | 56/56 PASS |
| Production build | PASS |
| Credential / secret scan | PASS; no credential found; one test-only sentinel string classified as non-secret |
| Debug marker scan | PASS; no `debugger`, `console.debug` or `console.trace` in application runtime source |
| TODO / temporary marker scan | PASS; no application-runtime marker found |
| Generated artifact exclusion | PASS |
| Environment file exclusion | PASS; only `.env.example` is tracked |
| Candidate worktree after verification | clean |

Local secrets, `.next`, `.vercel`, Supabase temporary metadata, coverage, `node_modules`, logs and local test artifacts are absent from the tracked RC tree. The complete per-file migration checksum set is recorded in `evidence/backoffice-production-rc.json`.

## Hosted PreProd re-verification

Deployment `dpl_FaKXuihKgJm8eJw1vQR8nv9Fj4na` remains READY behind the stable alias. The public homepage and representative SOODOO public DPP returned HTTP 200. The unauthenticated Backoffice context endpoint returned HTTP 401. The login response contained one CSP nonce and all 16 framework scripts used that same nonce.

An authorized PreProd-only SOODOO Tenant administrator was authenticated without persisting credentials in repository evidence. The server returned exactly one selectable Tenant context, `SOODOO E-bike`, with `tenant_admin` role and Tenant authority. Its Backoffice snapshot contained one Organisation, one Family, one Model, one SKU, one Batch, three Individuals, three Passports, three published versions, ten identifiers and three BMS snapshots. A request for a different Tenant was rejected with HTTP 403.

The existing accepted walkthrough and this re-verification cover the Dashboard, Tenant, Organisation, Family, Model, SKU, Batch, Individual, import preflight, mapping, claims, validation, candidates, review, approval, publication history, versions, identifiers/DPP IDs, Resolver/QR, documents, lifecycle, BMS, audience policy, integration/Registry status and audit surfaces. English, Simplified Chinese and 768px Backoffice usability remain accepted.

No restricted supplier, BMS or document values were found in the public SOODOO page.

```text
PREPROD_BACKOFFICE_REVERIFY = PASS
CSP_NONCE = PASS
TENANT_ISOLATION = PASS
BACKOFFICE_AUTHORIZATION = PASS
PUBLIC_DATA_LEAKAGE = NONE
CRITICAL_BACKOFFICE_ISSUES = 0
HIGH_BACKOFFICE_ISSUES = 0
```

## Preserved regressions and workflow readiness

The passing suite and hosted checks preserve both closed defects:

- per-request CSP nonces continue to reach all framework scripts, so hydration is not blocked;
- a V2-only Tenant user can enter `/dashboard/v2`, while the legacy V1 dashboard authorization gate remains separate.

The Backoffice still supports the intended controlled flow: create or select Tenant, associate Organisation and Product Model, preflight and map a customer file, review unresolved data, validate, form a candidate, review, approve, publish, then expose the immutable version through Resolver/QR. This establishes workflow capability only; it does not assert that real SOODOO customer data exists.

```text
REAL_CUSTOMER_ONBOARDING_WORKFLOW = READY
```

## Known LOW observation

Supabase admin-generated magic links still use `http://localhost:3000`. This remains LOW because the verified deployed workflow uses password login. Passwordless login must not be enabled or advertised until explicit Hosted PreProd and Production callback allowlists are configured and verified.

## Safety boundary

Freezing the RC created only the new Git reference. It did not deploy an application, write Production data, copy Synthetic Demo data, switch traffic, enable V2 Primary, submit to a Registry, activate a real connector, start the seven-day observation window or enter Phase 8.
