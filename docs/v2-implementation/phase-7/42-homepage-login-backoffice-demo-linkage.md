# Homepage, Login, Backoffice and Reference Demo Linkage

Date: 2026-09-29

Scope: application navigation only

Navigation RC commit: `72453e9a7965b2ce06dbe9feda7b07ecaa57c6a6`

PreProd deployment: `dpl_59DB7aXSRHBPtJUSQviv6sCuG1Hm`

Immutable URL: `https://greanlean-dpp-preprod-nophdgjsh-songweinie-1175s-projects.vercel.app`

Stable alias: `https://greanlean-dpp-preprod.vercel.app`

## Canonical routes

| Surface | Route |
| --- | --- |
| Homepage | `/` |
| Login | `/login` |
| V2 Backoffice | `/dashboard/v2` |
| Primary Reference Demo | `/p/DPP-GLR-EBIKE-000001` |

All user-facing navigation preserves `lang=en` or `lang=zh`. Login defaults to the V2 Backoffice. A relative `next` path is accepted only after same-origin validation; absolute, protocol-relative, encoded-slash, encoded-backslash, control-character and backslash forms fall back to the localized V2 Backoffice route.

## Verification result

| Check | Result |
| --- | --- |
| Homepage → Reference Demo | PASS |
| Homepage → Login | PASS |
| Footer → Login | PASS |
| Login → V2 Backoffice | PASS |
| Backoffice → Homepage | PASS |
| Backoffice → Reference Demo | PASS |
| Public DPP → Homepage | PASS |
| Public DPP → Login | PASS |
| English desktop navigation | PASS |
| Chinese mobile navigation (`390 × 844`) | PASS |
| Unauthenticated `/dashboard/v2` redirect | PASS |
| Anonymous Backoffice leakage | NONE |
| External redirect injection | BLOCKED |
| Public DPP unverified-warning contract | PRESERVED |

Hosted checks returned HTTP 200 for the English and Chinese homepages, login, the Reference DPP, and its public JSON resolver. The final authenticated browser check used the existing synthetic PreProd reference-author account and landed on `/dashboard/v2?lang=en`; no credential is recorded here.

## Automated verification

- Repository hygiene / lint: PASS
- TypeScript typecheck: PASS
- Unit and integration tests: 241 PASS, 0 FAIL
- Migration contract tests: 56 PASS, 0 FAIL
- Production build: PASS (49 static pages generated)
- Vercel PreProd build: PASS / READY

## Change boundary

This RC changes links, localized labels, safe login return-path handling, Backoffice/public-DPP utility navigation, and login-field accessibility association only.

```text
DATABASE_CHANGE = NO
MIGRATION_CHANGE = NO
DPP_PAYLOAD_CHANGE = NO
PRODUCTION_DATA_WRITE_REQUIRED = NO
PRODUCTION_DEPLOYED = NO
OBSERVATION_WINDOW_RESTART_REQUIRED = NO
```

The Production application and its active seven-day observation window were not changed. Promotion remains pending explicit approval after the current observation closes.
