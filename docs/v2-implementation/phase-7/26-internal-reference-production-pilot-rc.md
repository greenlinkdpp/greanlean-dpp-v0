# Phase 7 — Internal Reference Production Pilot RC

Generated: `2026-09-28`

## Result

```text
INTERNAL_REFERENCE_PRODUCTION_PILOT_PREPARATION = PASS
ACCEPTED_PREPROD_SOURCE_RESOLVED = TRUE
NEW_REFERENCE_PILOT_RC_FROZEN = TRUE
RC_REPRODUCIBLE = TRUE
```

The Technical Reference Pilot remains an internal synthetic pilot. The Real Customer Pilot has not started.

```text
TECHNICAL_REFERENCE_PILOT = INTERNAL_SYNTHETIC
REAL_CUSTOMER_PILOT = NOT_STARTED
```

## Accepted PreProd source proof

| Field | Value |
| --- | --- |
| Accepted deployment | `dpl_CjY6fVs8rJXv1qC2WUUnvpYQRKgR` |
| Stable alias | `https://greanlean-dpp-preprod.vercel.app` |
| Deployment state | `READY` |
| Deployment source mode | Manual Vercel CLI upload from the local working-tree snapshot |
| Git base commit | `199cdc05ddcae13911852a7a9c0399c57fb9ecf8` |
| Git base tree | `ea915ae3b97fa118029e9c57893f8e131dc082bf` |
| Deployment-attached Git commit/tree | none; the accepted deployment was intentionally not represented as a guessed commit |
| Vercel source manifest | 909 content-addressed source files |
| Source manifest SHA-256 | `94a6727513b21d50a35ecad53452749b667f6f9b3eb16c153070babba7a4e1f3` |
| Built output digest | `ee909c9ff3266b6685ae0efe4ebec332f2f00797b884af1f787a9c73a9239ed6` |

The Vercel deployment API source inventory was compared against the local source snapshot by file SHA-1. Of 909 uploaded files, 907 matched byte-for-byte. The only two differences were deployment evidence files updated after the deployment:

- `docs/v2-implementation/phase-7/25-reference-passport-publication-report.md`
- `docs/v2-implementation/phase-7/evidence/internal-reference-brand-pilot.json`

Their accepted deployed hashes remain recorded in the Vercel manifest (`a36d060ad7cea83962ce19bc63f29dfe166fec42` and `594f8a00e3e50a22e8cb4308dfe0a348970b896b`). Both are documentation/evidence only. The application runtime, Reference default-Tenant behavior, tests, and PreProd builder all matched the accepted deployment exactly before portability remediation. This content-addressed proof resolves the exact source without claiming that the manual deployment came from a Git commit that did not exist.

## Diff and classification versus the current Production RC

Current Production application RC: `4c0aa4a306fc7f62a57e374d07f57f55e84fbda0` / tree `cc17d8ceeb012774ce6435b68baf5dbcb79aea38`.

| Classification | Files / impact |
| --- | --- |
| `APPLICATION_RUNTIME` | `components/v2/backoffice/BackofficeConsole.tsx`: default Backoffice Tenant now prefers `greanlean-reference-mobility` instead of SOODOO |
| `CONFIGURATION` | `scripts/phase6b/configure-preproduction-env.mjs`: portable Node binary resolution; no application runtime impact |
| `TEST` | Backoffice information-architecture/unit contracts and `internalReferenceBrandContract.test.mjs` |
| `REFERENCE_FIXTURE` | Repository-owned approved Reference e-bike catalogue fixture |
| `REFERENCE_TOOLING` | Independent PreProd builder plus Production-only guarded dry-run planner |
| `DOCUMENTATION_ONLY` | Phase 7 Backoffice deployment evidence and Reference catalog/import/publication/readiness records; runtime impact none |
| `GENERATED_ARTIFACT` | Local HTML/JSON/header/QR inspection output removed and excluded from the RC |

No local environment file, secret, temporary password, build output, coverage output, `.vercel` metadata, or developer-local path is present in the RC.

## Repository-owned fixture

| Field | Value |
| --- | --- |
| Path | `fixtures/internal-reference/GreanLean_Reference_Ebike_Catalog_From_EN50604.json` |
| SHA-256 | `018c60c9db81d621aa439d5f801d5aad2756d29be4762bb85d106b2735425222` |
| Repository owned | TRUE |
| Local absolute fixture dependency | NONE |
| Environment override | `REFERENCE_FIXTURE_PATH`, optional |

The fixture remains `INTERNAL_SYNTHETIC_REFERENCE`, `customer_verified=false`, and forbidden for Registry/regulatory submission. Batch remains a Model-owned parallel dimension. No GTIN, Registry identity, specific cathode chemistry, or conformity conclusion was inferred.

## Frozen RC

| Field | Value |
| --- | --- |
| Reference | `codex/phase7-internal-reference-pilot-rc` |
| RC commit | `84e432cefa7e0aef8db6acc1e321ed94ad7ed40d` |
| RC tree | `a57a4b51145aeaab751a5f1587738dc819a875cf` |
| Tracked files | 910 |
| Build ID | `S0uaqvWf6xUwnOFiKPfx-` |
| Migration head | `0035` |
| Migration manifest SHA-256 | `6e34ca7a9b274ccf4cc92881453e0a6a3ccd69b53544fadeba86b7339caa76ab` |

## Final verification

| Gate | Result |
| --- | --- |
| Typecheck | PASS |
| Lint | PASS |
| Unit tests | 122/122 PASS |
| Integration tests | 107/107 PASS |
| Combined repository tests | 229/229 PASS |
| Reference contract tests | 5/5 PASS |
| Migration tests | 56/56 PASS |
| Production build | PASS |
| Credential scan | PASS; zero actionable findings; one established unit-test sentinel classification |
| Local absolute path scan | PASS; zero findings |
| Runtime debug/temporary marker scan | PASS; zero findings |
| Environment-file exclusion | PASS; only `.env.example` is tracked |
| Generated-artifact exclusion | PASS |

The failed convenience invocation of `test:all` was an environment runner issue (`npm` was unavailable in the bundled runtime). Every constituent command was then run directly with the bundled runtime and passed; no test gate was skipped.

## Hosted PreProd regression

```text
22/22 Resolver = 200
22/22 Version = 1
Reference warnings = PASS (22/22)
Backoffice Reference Tenant = PASS
Source vendor leakage = NONE
Public BMS leakage = NONE
QR = PASS
SOODOO_ACTIVE_DEMO = FALSE
SOODOO_DEFAULT_DEMO = FALSE
SOODOO_RETAINED_FOR_REGRESSION = TRUE
```

The portability remediation changed tooling/fixture resolution only after the accepted runtime snapshot. Application runtime impact was NONE, so no replacement Hosted PreProd deployment was required.

## Safety boundary

```text
PRODUCTION_DATA_WRITE_PERFORMED = NO
PRODUCTION_REFERENCE_TENANT_CREATED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
REGISTRY_SUBMISSION_PERFORMED = NO
REAL_CUSTOMER_CONNECTORS_ACTIVATED = NO
PHASE_8_ENTERED = NO
```

`V1_DPP_LATENCY_OBSERVATION = OPEN_FOR_PILOT_MONITORING`

