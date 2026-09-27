# ADR-009: API V1/V2 Coexistence

## Context

The repository contains unversioned APIs and a partial `/api/v1` surface used by current UI and integrations.

## Problem

Changing existing contracts in place would couple architecture migration to all clients and make rollback unreliable.

## Decision

Keep V1/unversioned routes compatible and limited to security, compatibility and observability fixes. Build new contracts under `/api/v2`, feature-flagged by environment/Tenant. Use adapters and shadow comparison before any client migration.

## Alternatives Considered

1. Replace V1 routes in place — rejected due breakage/rollback risk.
2. Fork an entirely separate application — rejected due duplicated operations and domain logic.
3. Keep adding unversioned routes — rejected because evolution/retirement cannot be governed.

## Why

Version coexistence enables additive delivery, tenant-level rollout and measurable compatibility while V1 remains operational.

## Consequences

- temporary adapter and test overhead;
- client inventory/deprecation process required;
- V2 uses explicit command resources and stable errors;
- feature flags need owner and expiry.

## Migration Impact

Clients migrate individually after contract/shadow tests. V1 sunset occurs only after usage reaches zero and notice/rollback windows close.

## Compatibility

Old method/path/response behavior is captured as golden contracts. V2 may expose richer resources without leaking them into V1.

## Security Impact

Both versions receive critical security fixes. V2 has mandatory Tenant context/PDP. No feature flag substitutes for authorization.

## Open Questions

- authoritative client inventory;
- deprecation notice/SLA;
- API gateway/rate-limit ownership;
- long-term treatment of unversioned legacy routes.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
