# 08 Phase 2 Test Matrix

## Current evidence

| Layer | Evidence | Result |
|---|---|---|
| Target guard | isolated Development ref and fingerprints | PASS |
| Migration contract | additive `0028` + matching rollback | PASS |
| Local migration tests | 36/36 | PASS |
| Local unit/integration | 161/161 | PASS |
| OpenAPI | YAML parse | PASS |
| TypeScript | `tsc --noEmit` | PASS |
| Build | Next.js production build | PASS |
| Live hierarchy | Model multiple SKUs; Batch 0:N SKU | PASS |
| Live item shapes | Model-only, +SKU, +Batch, +SKU+Batch | PASS |
| Live constraints | seven cross-Tenant/Model cases and missing link rejected | PASS |
| Live identifiers | normalization, checksum, collision, retire/reuse | PASS |
| RLS | Tenant isolation and exact Partner scope | PASS |
| Read-only role | direct DB and API writes denied | PASS |
| API/PDP | capability, forged Tenant, audit | PASS |
| Idempotency | replay and conflict | PASS |
| Legacy mapping | ambiguous SKU remains review-required | PASS |
| Migration round trip | UP → rollback → Phase 1 regression → UP | PASS |

## Round-trip evidence

After rollback, all seven Phase 2 REST resources returned 404, the `0028` ledger query returned zero rows, and the Phase 1 `tenant`, `organisation_v2`, and `policy_decision_audit` resources remained available. Phase 1 live security checks, 36 migration contracts, and 161 unit/integration tests passed before `0028` was reapplied. In final UP state, all seven tables returned 200, exactly one `0028` ledger row existed, both live verifiers passed, and the full local suite and build passed again.
