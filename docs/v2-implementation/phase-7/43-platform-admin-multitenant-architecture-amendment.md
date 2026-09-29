# Platform Admin multi-Tenant architecture amendment

Date: 2026-09-29  
Architecture baseline: **v2.1**  
Result: **PASS**

## Superseded operation

The earlier plan to grant the existing Platform Admin a Reference Tenant membership was stopped after read-only preflight and before mutation.

```text
PREVIOUS_MEMBERSHIP_TASK = SUPERSEDED_BEFORE_PRODUCTION_WRITE
PREVIOUS_PRODUCTION_WRITE_PERFORMED = NO
PREVIOUS_ROLLBACK_REQUIRED = NO
```

No per-Tenant membership was created for the Platform Operator. The verified synthetic PreProd Platform Operator has one active platform assignment, 22 `platform.*` capabilities, and zero `tenant_membership` rows.

## v2.1 decision

Tenant ownership remains mandatory for all Tenant-owned products, claims, passports, versions, identifiers, resolver mappings, files, integrations, and operational records. A Platform Role does not become a Tenant membership.

An authorized Platform Operator may perform platform-wide reads through declared platform capabilities. Every Tenant-owned write additionally requires an explicit active Tenant, server-side resolution of that Tenant as active, a declared operation capability, a resource scoped to that Tenant, and an audit decision. The client Tenant reference is requested scope only and never establishes authority.

The service-role database client remains an implementation mechanism behind the PDP and scoped repositories; it is not an authorization bypass. Tenant repositories retain `tenant_id` predicates. Platform-wide summaries use dedicated platform repositories and preserve Tenant ownership on every returned row.

## Identity and audit separation

Platform authority is stored in `platform_role_assignment`, separately from `tenant_membership`. Audit rows identify `PLATFORM_OPERATOR`, platform role/capability, resolved Tenant when applicable, resource, operation, decision, reason, correlation identifier, and safe metadata. Secrets are excluded.

The accepted Product, Schema, Claim, Provenance, Passport, Version, Current Pointer, Resolver, QR, Audience Projection, and Registry semantics are unchanged.

Implementation references:

- `docs/v2-architecture/adr/ADR-011-platform-operator-multitenant-context.md`
- `docs/v2-architecture/final/ARCHITECTURE-BASELINE-v2.1.md`
- `supabase/migrations/0036_v2_platform_operator_multitenant.sql`
- migration SHA-256: `ba077080223b6b462465a57a0594c8bb20e5d7b9051d02a232fbfa0c188316a5`
- rollback SHA-256: `d07582b7e31f10783caee83b194cd483ad46eb9be62f9eba7d54319b2207a2d9`

Production was not changed or deployed. Migration 0036 exists only in isolated PreProd, where apply, rollback, and reapply all passed.

## Round 1 platform console amendment

The Round 1 shell now follows the approved v0.2 platform-console structure: a dedicated Platform Overview, an explicit `Platform · All Tenants` scope card, a Tenant operating-progress table, and a single Tenant Workspace entry path. Platform Admin navigation does not create a Tenant membership and does not silently choose the Reference Tenant.

`/dashboard/v2` without a `tenant` query is intentionally a context-required state for Platform authority. A Tenant Workspace link carries the canonical Tenant code, while the server re-resolves the Tenant and re-checks the active platform capability before returning the snapshot. The URL is a request for scope, never authority.

The owner wordmark remains the byte-identical approved asset at `public/brand/greanlean-wordmark.png` (SHA-256 `729fc6d0249c8613bd8246dfc58011da42ccdb9c8f9de00874e1d6796c240eec`) and is rendered with CSS containment in the white logo card used by the shell and login.
