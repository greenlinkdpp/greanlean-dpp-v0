# Phase 5 API Contract

Tenant APIs require bearer authentication, verified tenant context, capability/PDP evaluation and audit. Mutating tenant APIs require `Idempotency-Key` unless the operation is explicitly a read or dry-run.

Routes:

- `/api/v2/connectors`, `/api/v2/connectors/{id}`
- `/api/v2/connectors/{id}/test`, `/credentials`, `/jobs`
- `/api/v2/connector-jobs/{id}`, `/retry`, `/cancel`
- `/api/v2/connector-receipts/{id}`
- `/api/v2/imports`
- `/api/v2/registry-submissions`, `/{id}`, `/{id}/poll`
- `/api/v2/bms/aggregate`
- `/api/v2/webhooks/{connectorCode}`

Capabilities are `connector.view`, `connector.manage`, `connector.execute`, `connector.retry`, `connector.read_receipt`, `connector.webhook.manage` and the existing Registry capabilities.

The OpenAPI source is `docs/v2-implementation/phase-1/openapi-v2.yaml`; it includes access class, auth, capability, tenant scope, idempotency, enforced rate behavior and error responses for every Phase 5 route. YAML parsing and Next.js route collection passed.
