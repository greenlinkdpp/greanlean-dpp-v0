# 10 V2 Implementation Gates and Phase 0/1 Backlog

## Gate policy

No task below is authorized by this document. It becomes implementable only after `V2 Architecture Accepted` and the relevant Production evidence gate.

## Phase 0 — evidence and operational foundation

### P0-01 Production environment and deployment baseline

- **Goal:** prove Production project, deployment commit, branch, build, domain aliases, Supabase project and region.
- **Files likely affected:** `docs/production-baseline/*`, read-only evidence scripts under a reviewed `scripts/audit/` location.
- **DB objects:** none.
- **API:** none; public/read-only probes only.
- **Tests:** evidence script redaction and no-write command review.
- **Exit criteria:** approved evidence identifies exact Vercel and Supabase Production pair.
- **Rollback:** delete local generated evidence containing no secrets; no Production state change.

### P0-02 Migration ledger and schema drift

- **Goal:** compare repository migrations/checksums with Production catalog.
- **Files likely affected:** evidence reports and read-only comparison scripts.
- **DB objects:** none in Production.
- **API:** none.
- **Tests:** fixture-based drift detection including missing/extra/changed migration.
- **Exit criteria:** every migration classified; catalog diff reviewed; unknown drift zero.
- **Rollback:** no Production change.

### P0-03 Backup and restore proof

- **Goal:** establish database/storage RPO, RTO and an isolated restore exercise.
- **Files likely affected:** runbooks and evidence only.
- **DB objects:** isolated restore target only under separate operations approval.
- **API:** recovery smoke test contract.
- **Tests:** restored constraints, pointers, file hashes, login and public DPP smoke checks.
- **Exit criteria:** signed restore report meets RPO/RTO.
- **Rollback:** remove isolated restore environment after approval; never touch source Production.

### P0-04 Secrets and integration inventory

- **Goal:** prove scope, exposure, owner and rotation of Supabase, Registry, BMS, signing and webhook secrets.
- **Files likely affected:** redacted inventory/runbooks; no secret values.
- **DB objects:** none.
- **API:** none.
- **Tests:** repository/full-bundle secret scanning and server/client boundary tests.
- **Exit criteria:** no high-privilege client exposure; rotation/revoke owners assigned.
- **Rollback:** evidence-only; rotation requires a separate instruction.

### P0-05 Structured logging and observability design

- **Goal:** baseline correlation IDs, structured logs, metrics, alerts and SLOs before V2 traffic.
- **Files likely affected:** `lib/server/apiRoute.ts`, `lib/server/logger.ts`, route wrappers, observability config after approval.
- **DB objects:** optional append-only security event sink, design first.
- **API:** all APIs return correlation ID; stable safe error shape.
- **Tests:** redaction, correlation propagation, error-path and sampling tests.
- **Exit criteria:** critical API, auth, storage, Registry and BMS failures alert with runbooks.
- **Rollback:** disable sink/exporter flag; retain local structured logging.

### P0-06 API/URL/QR compatibility snapshot

- **Goal:** freeze current clients, methods, response shapes, public URLs, aliases, GTIN and QR targets.
- **Files likely affected:** contract fixtures under tests/docs; no route behavior change.
- **DB objects:** none.
- **API:** read-only contract collection.
- **Tests:** replayable V1 and URL/redirect golden tests.
- **Exit criteria:** all known clients/QR patterns have owner and compatibility assertion.
- **Rollback:** evidence-only.

### P0-07 Test baseline

- **Goal:** add browser E2E, temporary real DB, RLS negative tests and migration dry-run pipeline.
- **Files likely affected:** test configuration, CI, fixtures and runbooks.
- **DB objects:** disposable test-only database.
- **API:** full V1 smoke suite.
- **Tests:** unit, integration, migration, RLS, E2E, restore smoke.
- **Exit criteria:** reproducible green baseline with no Production credentials.
- **Rollback:** remove disposable environment/CI job.

## Phase 0 gate

Production-connected Phase 1 is blocked until deployment identity, migration/schema/RLS state, backup/restore and secrets are proven. Local isolated Phase 1 scaffolding may begin only after architecture acceptance.

## Phase 1 — Tenant, Partner, Membership, and Policy Core

### P1-01 Additive Tenant model

- **Goal:** introduce Tenant as mandatory V2 isolation boundary without changing V1 organisation behavior.
- **Files likely affected:** new domain types/repositories/services; migration and rollback files; API V2 contracts.
- **DB objects:** `tenant`, `legacy_entity_mapping`.
- **API:** read/create/admin endpoints behind server flag.
- **Tests:** constraints, RLS, status lifecycle, idempotency, V1 regression.
- **Exit criteria:** Tenant exists independently from Organisation; no V1 row rewritten.
- **Rollback:** disable flag; drop only empty/unreferenced V2 objects via reviewed rollback.

### P1-02 Organisation V2 model and mapping

- **Goal:** model real-world organisations inside a Tenant and map V1 organisations explicitly.
- **Files likely affected:** organisation service, mapper, DTO/schema, admin UI later.
- **DB objects:** `organisation_v2`, mapping rows.
- **API:** `/api/v2/organisations`.
- **Tests:** parent/tenant consistency, duplicate identifiers, ambiguous mapping quarantine.
- **Exit criteria:** no Organisation is treated as Tenant; mappings are reviewable.
- **Rollback:** flag off; mapping/V2 rows removable by migration run ID.

### P1-03 Partner and Partner–Tenant authorization

- **Goal:** replace implicit service-provider access with explicit bounded authorization.
- **Files likely affected:** partner domain/service/PDP/audit, API routes.
- **DB objects:** `partner`, `permission_profile`, `partner_tenant_authorization`.
- **API:** `/api/v2/partners`, `/api/v2/partner-authorizations`.
- **Tests:** unbound/expired/revoked/out-of-scope denial; different scope per Tenant.
- **Exit criteria:** Partner never gains Tenant access from platform role alone.
- **Rollback:** revoke/disable V2 bindings and use unchanged V1 access until migration approval.

### P1-04 Tenant membership and role/capability

- **Goal:** separate membership, role template and enforceable capability.
- **Files likely affected:** auth context, membership service, capability catalogue.
- **DB objects:** `tenant_membership`, `role`, `capability`, `role_capability`.
- **API:** membership and role assignment endpoints.
- **Tests:** lifecycle/expiry, role changes, separation of reviewer/publisher, platform isolation.
- **Exit criteria:** V2 code contains no business authorization based solely on role-name conditionals.
- **Rollback:** V2 feature off; V1 membership untouched.

### P1-05 Tenant context

- **Goal:** derive Tenant context from authenticated membership or Partner authorization.
- **Files likely affected:** request context, API wrapper, repositories, audit logger.
- **DB objects:** helper functions/session claims only after security review.
- **API:** consistent tenant context/error codes.
- **Tests:** forged header, missing context, cross-Tenant resource ID, stale membership.
- **Exit criteria:** client input cannot establish Tenant authority.
- **Rollback:** disable V2 routes.

### P1-06 Scope grants and Policy Decision Point

- **Goal:** centralize finite capability decisions with resource attributes and purpose.
- **Files likely affected:** `lib/server/policy/*` (new), services and route wrappers.
- **DB objects:** `scope_grant`, append-only decision audit if approved.
- **API:** internal policy contract; no arbitrary public rules endpoint.
- **Tests:** capability/scope matrix, field ceiling, stable reason codes, audit redaction.
- **Exit criteria:** every V2 handler declares capability and receives a PDP decision.
- **Rollback:** V2 routes disabled; no effect on V1.

### P1-07 Tenant RLS and negative-test suite

- **Goal:** reinforce API decisions in PostgreSQL and Storage.
- **Files likely affected:** reviewed migration/rollback, database tests, CI.
- **DB objects:** RLS policies, safe helper functions and grants for new V2 tables only.
- **API:** none beyond consistent auth context.
- **Tests:** Tenant A/B, Partner binding, platform role, service function, storage and enumeration denial.
- **Exit criteria:** all negative tests pass against disposable DB and staging; policy catalog reviewed.
- **Rollback:** application flag off first; policy rollback only if no V2 Production data and separately approved.

### P1-08 Audit and impersonation design stub

- **Goal:** record sensitive decisions and reserve safe support access without implementing customer-password access.
- **Files likely affected:** audit event schema/service and design docs.
- **DB objects:** append-only decision/session metadata if approved.
- **API:** no impersonation activation in Phase 1 unless separately authorized.
- **Tests:** immutability, redaction, deny audit, expiry/revoke design tests.
- **Exit criteria:** all Partner/role/grant changes are attributable; impersonation remains disabled by default.
- **Rollback:** flag off; immutable audit retained.

## Phase 1 gate

- cross-Tenant negative tests are green;
- Partner authorization lifecycle is proven;
- every V2 record has Tenant ownership;
- service-role call sites are enumerated and policy-gated;
- V1 behavior and tests remain unchanged;
- backup/restore evidence exists before any Production DDL request;
- security and architecture reviewers approve the migration and rollback.

Only after this gate should Product hierarchy, Passport Version, Schema/Claim, or Resolver implementation enter a later phase.
