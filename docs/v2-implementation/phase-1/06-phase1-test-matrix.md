# 06 Phase 1 Test Matrix

## Status

ALL REQUIRED PHASE 1 GATES PASS

| Layer | Evidence | Result |
|---|---|---|
| Environment | Dev/Production project and host fingerprints differ | PASS |
| Guard | known Production target aborts with no ordinary override | PASS |
| Migration | additive 0027 + matching rollback contract | PASS |
| Round trip | UP → tests → rollback → V1 tests → UP → full tests | PASS |
| Database | same-Tenant membership Role composite FK | PASS |
| Database | cross-Tenant/platform Role membership | REJECTED |
| RLS | Tenant A cannot read Tenant B Organisation | PASS |
| RLS | Partner sees only granted Organisation A1, not A2/B1 | PASS |
| Relationship | missing/expired/revoked Partner authorization | DENIED |
| API | anonymous Tenant API | 401 AUTH_REQUIRED |
| API | forged Tenant context | 403 TENANT_RELATIONSHIP_REQUIRED |
| API | Partner list without a list-level resource scope | 403 RESOURCE_OUT_OF_SCOPE |
| API | same idempotency key/body | original 201 replayed |
| API | same idempotency key/different body | 409 IDEMPOTENCY_KEY_REUSED |
| Repository | missing verified PDP context | rejected before DB call |
| Audit | allow and deny decisions recorded; update rejected | PASS |
| Storage | private bucket, public denial, signed read, cleanup | PASS |
| Regression | migration contracts | 32/32 PASS |
| Regression | unit/integration | 151/151 PASS |
| Build | lint, TypeScript, Next production build | PASS |

Synthetic fixtures: two Tenants, Organisations A1/A2/B1, Partner P, four test Auth users, active P→A authorization, resource allow for A1, and temporary expired/revoked P→B authorizations removed after verification.

