# ADR-010: External Standards and Systems as Adapters

## Context

GreanLean must interact with Registry, UNTP, JSON-LD, VC, GS1, Catena-X/EDC, QSeal, ERP, MES, PLM and BMS systems whose contracts and maturity vary.

## Problem

Embedding provider/standard structures in the core domain makes internal identity, workflow and data dependent on external changes and regional availability.

## Decision

Keep all external standards and systems behind versioned adapters. Core domains expose connector contracts, mappings, credential references, external identifiers, submission jobs and receipts. Adapters translate canonical claims without redefining core entities.

## Alternatives Considered

1. Adopt one external model as the core — rejected because it cannot cover all sectors/providers.
2. Build complete adapters now — rejected due unconfirmed requirements and unnecessary scope.
3. Let each route call providers directly — rejected due credential, retry and consistency risks.

## Why

Adapters isolate change, support test environments and prevent external outages from corrupting immutable local publications.

## Consequences

- mapping and connector lifecycle are explicit;
- asynchronous jobs/idempotency/receipts are required;
- conformance is claimed per adapter/version, not globally;
- several future capabilities remain intentionally unimplemented.

## Migration Impact

The Registry TEST implementation remains an adapter. Existing BMS ingestion becomes a connector with Tenant/device scope. No Production connector is enabled by this decision.

## Compatibility

External IDs are preserved in the identifier model. Existing exports can coexist with later adapters.

## Security Impact

Credentials stay in a secret manager and are reference-only in domain data. Each connector has least privilege, egress controls, timeout/retry, audit and regional policy.

## Open Questions

- official Production Registry contract;
- UNTP/VC/QSeal priority;
- Catena-X/EDC participant requirements;
- China/EU residency and connector hosting.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
