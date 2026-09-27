# 08 API V2 Boundaries

## Coexistence policy

- `/api/v1` and existing unversioned routes remain compatible during migration.
- V1 receives only security, compatibility, and observability changes.
- all new domain contracts use `/api/v2`.
- V2 is disabled by default per environment/Tenant until its gate is met.
- no V1 route silently changes response semantics to a V2 model.

## Resource boundaries

| Route group | Primary operations | Required capability examples |
|---|---|---|
| `/api/v2/tenants` | platform-managed Tenant lifecycle/read | `tenant.create/view/manage` |
| `/api/v2/partners` | Partner identity | `partner.view/manage` |
| `/api/v2/partner-authorizations` | propose/approve/revoke bindings | `partner_authorization.*` |
| `/api/v2/organisations` | Tenant organisations | `organisation.view/edit` |
| `/api/v2/memberships` | Tenant membership | `membership.view/manage` |
| `/api/v2/product-families` | optional family catalogue | `product.view/edit` |
| `/api/v2/product-models` | technical models | `product.view/edit` |
| `/api/v2/skus` | commercial configurations | `product.view/edit` |
| `/api/v2/batches` | production batches and SKU links | `product.view/edit` |
| `/api/v2/items` | physical individuals | `product.view/edit` |
| `/api/v2/identifiers` | issue/link/retire identifiers | `identifier.manage` |
| `/api/v2/passports` | Passport identity and version history | `dpp.view/create/edit` |
| `/api/v2/passport-candidates` | resolve/validate draft candidate | `dpp.edit` |
| `/api/v2/passport-reviews` | submit/review/approve/reject | `dpp.submit_review/review/approve/reject` |
| `/api/v2/publications` | publish/supersede/withdraw | `dpp.publish/withdraw` |
| `/api/v2/schemas` | Schema Registry | `schema.view/manage/publish` |
| `/api/v2/imports` | preflight/commit/status/errors | `import.create/commit` |
| `/api/v2/resolver/{identifier}` | resolution | anonymous public or authorized audience |
| `/api/v2/registry-submissions` | adapter jobs/results | `registry.submit/view` |

Commands use explicit resources. Avoid a generic `action=publish` or `action=approve` parameter.

## Request contract

Every authenticated business request includes or derives:

- authenticated identity;
- server-resolved Tenant context;
- capability and purpose;
- idempotency key for commands;
- `If-Match`/version for mutable drafts where relevant;
- correlation ID;
- validated JSON body with unknown-field policy.

Client-provided Tenant IDs are treated as requested scope and checked against membership/authorization.

## Response contract

```json
{
  "data": {},
  "meta": {
    "correlationId": "...",
    "apiVersion": "v2",
    "resourceVersion": "..."
  }
}
```

Errors:

```json
{
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "The requested resource is not available.",
    "correlationId": "...",
    "details": []
  }
}
```

Stable codes distinguish validation, conflict, authorization, state transition, dependency, rate-limit, and adapter failures without leaking restricted existence.

## API mechanics

- cursor pagination with bounded page size;
- UTC ISO timestamps and explicit locale/unit metadata;
- ETag/version for concurrency;
- idempotent command replay returns the prior result when payload hash matches;
- payload mismatch on the same key returns conflict;
- rate limits by identity/Tenant/route and stricter anonymous resolver limits;
- no service-role credential in client code;
- OpenAPI contract generated/verified in CI;
- deprecation/sunset headers for V1 only after client inventory and notice.

## Adapter APIs

External standards do not determine internal resource shapes. Connectors consume canonical claims and produce jobs/receipts:

```text
core command → submission job → adapter → external system → receipt/result
```

Timeout or failure never mutates an immutable DPP Version. Retrying uses the same idempotency identity.

## V1 compatibility adapter

V1 responses may be projected from V2 for migrated Tenants only after shadow comparison. Otherwise V1 remains authoritative. The adapter records source/version but does not expose V2-only fields that change V1 contracts.

## Acceptance criteria

- contract tests cover every V2 method, capability, tenant boundary and error code;
- V1 tests remain green;
- commands are idempotent and state-machine guarded;
- no route infers authorization from role strings alone;
- resolver/public APIs return one immutable version;
- API docs clearly label public, Tenant, Partner, platform and integration surfaces.

Related decisions: ADR-009 and ADR-010.
