# Phase 4 API contract

Implemented route groups:

- Passport: create/list/read/patch, integrity and Version history.
- Review: submit/list/read/approve/reject/request changes.
- Publication: publish and withdraw.
- Resolver Mapping: controlled creation.
- Public: Resolver-backed JSON, HTML, JSON-LD, PDF, API and QR.

Tenant routes require bearer authentication, `x-tenant-id`, PDP capability checks and correlation IDs. Mutations require persistent Idempotency-Key handling. Public resolution is anonymous but restricted to public mappings and PUBLIC projection.

The authoritative specification is [openapi-v2.yaml](../phase-1/openapi-v2.yaml). Phase 4 operations declare access class, authentication, capability, Tenant scope, idempotency and safe errors.

