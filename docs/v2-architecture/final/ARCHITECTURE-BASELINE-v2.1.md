# GreanLean V2 Architecture Baseline v2.1

## Baseline record

| Field | Value |
|---|---|
| Version | `2.1` |
| Status | `ACCEPTED` |
| Accepted At | `2026-09-29` |
| Supersedes | V2.0 only where this amendment explicitly changes Platform Operator access |
| Authorized implementation scope | Local and isolated PreProd Platform Admin multi-Tenant operations |
| Production deployment | `NOT AUTHORIZED` |

All V2.0 domain, product hierarchy, canonical data, publication, Resolver, API coexistence, adapter, residency, and risk decisions remain accepted. ADR-011 is added to the accepted ADR set.

## Platform Operator amendment

- `platform_role_assignment` is the explicit Platform authority and is separate from `tenant_membership`.
- Platform Admin is not granted automatic access by the legacy role label alone and is not inserted into every Tenant.
- Platform-wide reads require an exact `platform.*` capability and preserve Tenant ownership on every business row.
- Any product, Organisation, import, Claim, DPP, Resolver, or related business write requires an explicit active Tenant context.
- The requested Tenant identifier never establishes authority; the server verifies the Platform assignment, exact platform capability, active Tenant, and resource relationship.
- Tenant-scoped operations reuse existing V2 service/repository boundaries, idempotency rules, and audit controls.
- Platform decisions are recorded in both the existing policy decision audit and the append-only Platform Operator audit when operating through Tenant APIs.
- The Platform Console is `/dashboard/platform`; `/dashboard/v2` remains the selected Tenant workspace.

## Operational limits

- Production application deployment is not part of this baseline amendment.
- Production `FEATURE_V2_FILE_IMPORT` remains disabled.
- Production Registry submission and real external connectors remain disabled unless separately authorized.
- Customer/Tenant login opening, impersonation, Phase 8, and Production promotion require separate instructions.
- The official owner logo remains outside the baseline until a verified SVG or transparent PNG is supplied.

## Acceptance invariants

```text
platform authority != tenant membership
platform-wide read = exact platform capability + visible Tenant ownership
business write = exact platform capability + verified active Tenant + Tenant-scoped domain API
client Tenant ID = requested scope only
service role = repository mechanism, never user authority
deny and allow decisions = auditable
```

