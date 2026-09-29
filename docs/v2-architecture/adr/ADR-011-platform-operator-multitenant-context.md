# ADR-011 — Platform Operator Multi-Tenant Context

## Status

Accepted on 2026-09-29 as the GreanLean V2.1 access-control amendment.

## Decision

Platform administration is an explicit platform-level authority, not a collection of Tenant memberships. A verified Platform Operator may read authorised platform-wide inventories, but every business operation is rebound to one explicit, active `tenant_id` before the existing V2 capability, service, repository, RLS, idempotency, and audit boundaries are entered.

The authority chain is:

```text
Authenticated user
→ active platform_role_assignment
→ PLATFORM role
→ explicit platform.* capability
→ verified active Tenant context for business operations
→ existing Tenant-scoped V2 API/repository
→ policy_decision_audit + platform_operator_audit
```

The application must not infer platform authority from a UI flag, a client-provided Tenant ID, the service-role key, or a legacy Organisation relationship. `tenant_membership` remains the authority for a user acting as a Tenant member; Platform Operators are not provisioned into every Tenant.

## Consequences

- Platform inventories may aggregate multiple Tenants, but every returned business row retains Tenant ownership metadata.
- A Platform Operator selects an Active Tenant before entering `/dashboard/v2`; the server independently verifies the Tenant and capability.
- Tenant-scoped writes use the same domain endpoints and always carry a requested `x-tenant-id`; the PDP treats it only as requested scope.
- Missing capability, missing/inactive Tenant, forged Tenant context, or cross-Tenant resource use is denied and audited.
- Platform audit records are append-only and contain no credentials or secret material.
- Production file import remains controlled by its existing feature gate; this amendment does not enable it.
- Customer login, Production Registry submission, real connectors, and impersonation remain outside this decision.

## Rejected alternatives

- Creating one Tenant membership per Tenant for the Platform Admin.
- Treating a PLATFORM role as an unconditional RLS/service-role bypass.
- Trusting a Tenant selector or header without server-side authority evaluation.
- Mixing platform-wide records without visible Tenant ownership.

