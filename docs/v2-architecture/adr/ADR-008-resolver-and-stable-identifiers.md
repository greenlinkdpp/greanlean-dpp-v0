# ADR-008: Resolver and Stable Identifiers

## Context

Current resolution is distributed across `/p`, GS1 routes, aliases, product columns and code-based pre-migration maps. QR generation can encode a supplied URL.

## Problem

Distributed resolution creates ambiguity, open-redirect risk and fragile QR compatibility. Registry IDs must not control public URL stability.

## Decision

Introduce a Resolver owning normalized identifiers, hosts, paths, aliases and legacy redirects. It resolves to Passport identity/current version. Registry ID is one external identifier; QR is a data carrier, not an authority.

## Alternatives Considered

1. Use Registry ID as canonical route — rejected because external systems change independently.
2. Keep resolver rules in application code — rejected because inventory, expiry and audit are weak.
3. Redirect every old URL directly to new internal UUIDs — rejected because internal identity leaks and mapping becomes inflexible.

## Why

The Resolver stabilizes physical QR links, supports multiple standards, and centralizes ambiguity/cycle/security checks.

## Consequences

- mappings require governance and synthetic monitoring;
- hosts/custom domains become explicit configuration;
- old URLs are retained long term;
- caching includes version and audience.

## Migration Impact

Import active aliases and code mappings with provenance. Never reuse a retired identifier for another Passport. Existing QR images remain unchanged.

## Compatibility

`/p/{identifier}`, slugs, DPP IDs, `/01/{gtin}` and named legacy routes continue through mappings.

## Security Impact

Approved-host checks prevent open redirects; rate limits reduce enumeration; cross-Tenant and cyclic mappings are rejected; private-resource existence is not disclosed.

## Open Questions

- permanent URL/QR retention policy;
- custom-domain roadmap;
- identifier issuer/normalization governance;
- withdrawn/retired response policy.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
