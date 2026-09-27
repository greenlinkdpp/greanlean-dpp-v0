# ADR-002: Partner–Tenant Authorization

## Context

V1 includes service-provider and partner-editor behavior, but Partner is not a first-class object and access is not expressed as an explicit Tenant relationship.

## Problem

A platform role or product grant alone cannot safely express which Partner may access which Tenant, for what purpose, during which period, and with whose approval.

## Decision

Model Partner as an independent platform-level legal actor with its own legal identity fields and no `tenant_id`. Partner does not reference Tenant-owned `organisation_v2`. Require an explicit `partner_tenant_authorization` with permission profile, scope, validity, state, approver and evidence. Partner access is the intersection of verified Partner identity, active authorization, capabilities and resource scope.

## Alternatives Considered

1. Give Partner users platform-admin access — rejected as excessive and unauditable.
2. Treat Partner as a child Tenant — rejected because one Partner serves multiple Tenants independently.
3. Use only per-product grants — rejected because lifecycle, expiry, approval and broader bounded services are missing.

## Why

The relationship makes deny-by-default enforceable and lets two Tenants grant different access to the same Partner.

## Consequences

- authorization administration and expiry jobs are required;
- customer approval evidence becomes part of the access model;
- role templates alone are insufficient;
- revocation must invalidate sessions/caches promptly.

## Migration Impact

Existing service-provider accounts are not auto-converted. Candidate bindings are generated for review; access remains on the V1 path until each Tenant approves migration.

## Compatibility

V1 partner behavior continues during coexistence. V2 endpoints never infer a binding from V1 platform roles.

## Security Impact

Unbound, expired, revoked and out-of-scope requests are denied and audited. High-risk profiles may require dual approval. Cross-Tenant enumeration is prevented.

## Open Questions

- customer invitation/approval flow;
- dual-approval threshold;
- default Partner permission profiles;
- emergency suspension and notification owners.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
