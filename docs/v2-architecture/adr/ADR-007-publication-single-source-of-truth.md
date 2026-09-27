# ADR-007: Publication Single Source of Truth

## Context

The current read path prefers canonical snapshots but can fall back to legacy snapshots, `product_versions`, and live tables.

## Problem

Different output formats or requests may observe different data after editing, undermining published-version immutability and auditability.

## Decision

For every V2-primary Passport, the current immutable `dpp_version` is the only formal source for HTML, JSON, JSON-LD, PDF, API and QR resolution. Live fallback is compatibility-only and must be disabled per Passport after shadow acceptance.

## Alternatives Considered

1. Continue canonical-first silent fallback permanently — rejected because failures become undetectable content changes.
2. Render every format directly from live domain tables — rejected because publication is no longer frozen.
3. Store independent format snapshots — rejected because formats can drift.

## Why

One source guarantees consistent version/hash metadata and supports review, signature, caching and rollback by pointer.

## Consequences

- publication candidate generation must be reliable;
- pointer/source failures return an explicit error or tombstone, not live content;
- format renderers become projections;
- shadow comparison is a mandatory cutover gate.

## Migration Impact

V1 remains unchanged until a Passport is marked V2-primary. Differences are classified and resolved before the switch. Rollback moves the routing flag/pointer, not payload content.

## Compatibility

Old URLs and V1 API shapes remain. Their content may be projected from the current V2 version after compatibility tests.

## Security Impact

Public output cannot accidentally include later draft edits. Audience projection caps fields at the requested access class and never changes the immutable source.

## Open Questions

- failure UX when pointer/version is unavailable;
- withdrawal tombstone policy;
- cache purge guarantees;
- signature/QSeal timing.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
