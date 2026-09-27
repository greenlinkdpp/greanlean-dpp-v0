# ADR-003: Product Model, SKU, Batch, and Item

## Context

V1 `products` mixes model identity and an SKU string. Battery tables provide Model/Batch/Item, while other sectors lack a common hierarchy.

## Problem

A forced Family → Model → SKU → Batch → Item chain assumes every manufacturing batch belongs to one SKU, which is not established and may be false across industries.

## Decision

Use an optional Family, mandatory Model parent for SKU/Batch/Item, a 1:N Model→SKU relation, a Model-owned Batch, optional 0:N Batch–SKU link, and Item with optional SKU and Batch. All relationships enforce matching Tenant and Model.

## Alternatives Considered

1. Single strict chain — rejected because Batch/SKU association is not universal.
2. Nullable `sku_id` on Batch — simpler but prevents a batch serving multiple SKUs.
3. Generic graph for every relationship — rejected as over-generalized and difficult to constrain.

## Why

The model preserves manufacturing and commercial concepts separately while keeping strong, testable invariants.

## Consequences

- some reads require a Batch–SKU join;
- Family remains optional;
- a central subject registry supports claims/identifiers/passports;
- changes in Item association are audited events, not historical rewrites.

## Migration Impact

`products` maps to Model. `products.sku` becomes an SKU only with evidence. Battery Batch maps without inventing SKU links. Item serial/UPI and optional Batch are preserved.

## Compatibility

V1 product IDs and SKU fields remain available through mapping/projection. No current QR or URL changes.

## Security Impact

Composite Tenant/Model FKs prevent cross-Tenant and cross-Model attachment. Identifier uniqueness and enumeration controls remain separate.

## Open Questions

- whether real batches span multiple SKUs;
- SKU reassignment rules for Items;
- serial uniqueness domains;
- when Family is valuable to customers.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
