# Phase 3 API Contract

Implemented routes:

- `/api/v2/schemas`, `/schema-versions`, `/field-definitions`;
- `/api/v2/data-sources`, `/source-records`;
- `/api/v2/mapping-profiles`, `/mapping-versions`;
- `/api/v2/mapping-versions/{id}/dry-run` and `/commit`;
- `/api/v2/canonical-claims`;
- `/api/v2/products/{subjectType}/{subjectId}/resolved-data` and `/validation`.

All routes require bearer authentication, verified Tenant context, a capability decision, PDP audit and server-side service execution constrained by Tenant/resource scope. Mutations require persistent idempotency; Dry Run and reads do not.

The OpenAPI at `docs/v2-implementation/phase-1/openapi-v2.yaml` is versioned `2.0.0-phase3` and declares surface, auth, capability, Tenant scope, idempotency, correlation ID and relevant safe errors for every Phase 3 route.
