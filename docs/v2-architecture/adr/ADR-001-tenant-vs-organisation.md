# ADR-001: Tenant vs Organisation

## Context

V1 uses `dpp_organisation` for membership, ownership and operator data. V2 needs an explicit SaaS isolation/configuration boundary while also representing multiple legal and operating entities.

## Problem

Reinterpreting each V1 organisation as a Tenant would conflate workspace ownership with legal identity, prevent multi-entity customers, and preserve ambiguity in every downstream foreign key.

## Decision

Create a first-class `tenant` as the mandatory V2 ownership and isolation boundary. Create `organisation_v2` as a Tenant-owned real-world organisation. Do not rename or reinterpret `dpp_organisation`; map it explicitly to a Tenant and one or more Organisation records.

## Alternatives Considered

1. Rename `dpp_organisation` to Tenant — rejected because semantics and data are mixed.
2. Keep Organisation as the only boundary — rejected because configuration, residency, billing and membership need a workspace identity.
3. Global Organisation directory first — deferred because it introduces cross-tenant sharing and identity-governance complexity.

## Why

The separation creates a stable security boundary, supports multi-country/multi-facility customers, and lets legal-entity changes occur without changing Tenant ownership.

## Consequences

- every V2 business row carries `tenant_id`;
- an Organisation cannot implicitly grant workspace access;
- additional mapping and UI terminology are required;
- duplicate tenant-owned representations of the same supplier are acceptable initially.

## Migration Impact

Each V1 organisation requires a reviewed mapping. Ambiguous ownership is quarantined; no default Tenant is assigned. V1 primary keys and behavior remain unchanged.

## Compatibility

V1 APIs continue returning V1 organisation structures. V2 adapters expose Tenant and Organisation separately.

## Security Impact

RLS and application policy use Tenant as the invariant boundary. Composite FKs prevent cross-Tenant relationships. Platform roles do not imply Tenant membership. Tenant Membership references only a same-Tenant `TENANT` Role through a composite database constraint.

## Open Questions

- workspace-to-legal-entity cardinality for each customer;
- future verified global Organisation directory;
- Tenant transfer/merger process and residency policy ownership.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
