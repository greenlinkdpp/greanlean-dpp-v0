# GreanLean V2 Architecture Baseline v2.0

## Baseline record

| Field | Value |
|---|---|
| Version | `2.0` |
| Status | `ACCEPTED` |
| Accepted At | `2026-09-23` |
| Supersedes | none |
| Authorized implementation scope | isolated Local/Development Phase 1 only |
| Production status | `BLOCKED`; no Production-connected development or migration authorized |

## Accepted ADRs

- ADR-001 — Tenant vs Organisation
- ADR-002 — Partner–Tenant Authorization
- ADR-003 — Product Model, SKU, Batch, and Item
- ADR-004 — DPP Identity vs Version
- ADR-005 — Schema Authority
- ADR-006 — Canonical Data and Provenance
- ADR-007 — Publication Single Source of Truth
- ADR-008 — Resolver and Stable Identifiers
- ADR-009 — API V1/V2 Coexistence
- ADR-010 — External Standards and Systems as Adapters

## Tenant, Organisation, and Partner

- Tenant is the SaaS workspace, data-isolation, configuration, permission, residency, and future billing boundary.
- Organisation is a Tenant-owned representation of a real-world legal or operating actor.
- A Tenant may contain multiple Organisations; Tenant and legal entity are not 1:1.
- Mutable Organisation rows are not shared across Tenants. External identifiers may align representations without sharing ownership.
- Partner is an independent platform-level entity with its own legal identity fields and no `tenant_id`.
- Partner does not reference Tenant-owned `organisation_v2`.
- Customer access exists only through active, in-scope `partner_tenant_authorization`.
- Partner requests may be initiated by a Partner but require a Tenant authorizer.
- Phase 1 does not implement generalized dual approval; high-risk Publisher/Admin capabilities remain explicit and audited.

## Membership, Role, Capability, and Scope

- Role is a permission template; Capability is the enforcement unit.
- Tenant Membership can reference only a same-Tenant Role with `role_class = TENANT`.
- The Tenant/Role/Class invariant is enforced with a composite database relationship, not only application validation.
- Platform Roles do not automatically grant Tenant access.
- Partner effective access equals Partner identity capability ∩ Partner–Tenant Authorization ∩ Scope Grant ∩ requested resource.
- The Policy Decision Point defaults to deny and returns a reason code, effective scope, policy version, and decision ID.
- Product Family is not a Phase 1 permission boundary.
- Impersonation is not implemented in Phase 1.

## Product hierarchy

```text
Product Family (optional)
        ↓
Product Model
      ↙      ↘
    SKU      Batch
      \       /
       Individual
```

- SKU and Batch belong to Product Model.
- Batch may relate to zero through many SKUs through `batch_sku_link`.
- Individual belongs to Tenant + Model and may optionally reference SKU and Batch.
- every relationship must preserve Tenant and Model consistency.
- Product Family is used only for classification and value inheritance in the accepted baseline.

## DPP identity, profile, version, and publication

- `dpp_passport` is stable identity; `dpp_version` is immutable published content.
- Passport includes `passport_profile_code`, defaulting to `PRIMARY`.
- Uniqueness is one active Passport per Tenant + subject type + subject ID + Passport Profile.
- The same subject may have separate Passports for profiles such as `EU_BATTERY`, `ESPR`, or future controlled profiles.
- Published payloads cannot be updated or deleted; corrections create new versions.
- Current Pointer selects the current published version; withdrawal/supersession preserves history.
- Registry acceptance is independent from local publication state.

## Schema authority

All new V2 fields originate from:

```text
Schema Definition
→ immutable Schema Version
→ Field Definition
→ Validation / Applicability / Access Policy
```

Legacy fixed columns, `dpp_field_templates`, and parallel value tables remain compatibility sources and do not become additional V2 authorities.

## Canonical data and provenance

```text
Source
→ versioned Mapping
→ Transformation
→ Canonical Claim
→ Validation
→ Provenance
→ DPP Candidate
```

- explicit field states are `INHERIT`, `OVERRIDE`, `CLEAR`, `NOT_APPLICABLE`, and `UNKNOWN`;
- `null` is not overloaded as business meaning;
- important claims identify provider, source, raw/reference value, transformation, times, actor, verification, and evidence;
- raw or restricted source values are not copied into public snapshots without an explicit public-safe projection.

## Published DPP source of truth

For a V2-primary Passport:

```text
Resolver
→ Current Pointer
→ Immutable DPP Version
→ Audience Projection
→ HTML / JSON / JSON-LD / PDF / API / QR
```

V2-primary Passports cannot silently fall back to live V1 tables. Legacy fallback remains only during measured compatibility and shadow comparison.

## Resolver

- Resolver owns stable identifiers, aliases, hosts, paths, and compatibility redirects.
- QR is a data carrier, not the identifier authority.
- Registry IDs are external identifiers and do not determine QR or public URL stability.
- critical existing QR and public identifiers are compatible in principle permanently and cannot be reassigned to another Passport.
- Tenant custom domains are not enabled in Phase 1; future support requires ownership verification and host-scoped mapping.

## API coexistence

- existing V1/unversioned contracts remain compatible and receive only security, compatibility, and observability fixes;
- new contracts use `/api/v2` and are disabled by default;
- every V2 business request authenticates, resolves Tenant/relationship context, evaluates capability/scope in the PDP, and then reaches service/RLS;
- client-provided Tenant IDs are requested scope only and never establish authority;
- V1 has no sunset date in this baseline.

## External adapter boundary

EU Registry, UNTP, VC, JSON-LD context, Catena-X, EDC, GS1, ERP, MES, PLM, BMS, QSeal, and future external systems remain adapters. Core domains store connector contracts, mappings, credential references, external identifiers, jobs, results, and receipts without adopting provider models as internal truth.

## Residency and risk defaults

- Phase 1 stores residency policy only; it does not implement China/EU active-active or automatic cross-border synchronization.
- raw, BMS, and confidential data are not automatically transferred across regions.
- Production RPO/RTO remain deferred until backup/restore evidence and business-impact analysis exist.
- developers cannot accept Critical residual risk; an explicit risk owner is required.

## Explicit Phase 1 scope

Tenant, Organisation V2, Partner, Partner–Tenant Authorization, Tenant Membership, Role, Capability, Role–Capability, Permission Profile, Scope Grant, Policy Decision Point, policy audit foundation, API V2 security shell, RLS, and negative tests.

## Explicit exclusions

Phase 1 does not implement Product Family/Model/SKU/Batch/Individual, Schema migration, Canonical Claim, full Provenance, Passport/Version, Resolver, new QR logic, Production Registry, JSON-LD, VC, UNTP, Catena-X, EDC, regional nodes, custom domains, impersonation, BMS V2, Production migration, Production feature-flag changes, or any V1 deletion.

## Deferred decisions

The following remain for later owners/phases: Item SKU reassignment semantics, serial uniqueness domains, DPP granularity authority, withdrawal public response, retention periods, mandatory-field `CLEAR` policy, raw source retention, automatic verification trust, Registry subject contract, field-purpose approval, and final RPO/RTO.

## Development gate

Phase 1 database/API implementation may proceed only when all Development database, Storage, and Secrets are proven different from Production. If isolation cannot be proved, implementation stops after architecture acceptance and records the blocker.
