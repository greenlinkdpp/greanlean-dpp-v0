# Legacy data reconciliation

## Current reconciliation

```text
source 5
→ mapped 0
→ review/excluded 5
→ target 0
```

The two identical deterministic hashes prove classification repeatability for the same Development input. They do not prove a complete migration.

| Required category | Current evidence | Status |
|---|---|---|
| Source count | 5 legacy products | PASS |
| Mapped count | 0 | PASS as truthful result |
| Review-required count | 5 | PASS |
| Unmapped/invalid count | 0 at this classifier stage | PARTIAL |
| Identifier collisions | Not run across complete identifier set | BLOCKED |
| Orphan relations | Not run across all V1 entities | BLOCKED |
| Schema blockers | `products.sku` semantic ownership unresolved | BLOCKED |
| Publication compatibility | Not compared in Pre-Production | BLOCKED |

## Required decisions

Product/Data Owner must define whether each legacy `products.sku` value denotes a sellable SKU, a model code, or a display-only identifier. Migration Owner must then version the mapping, preserve source provenance, enumerate conflicts/duplicates/invalid records, and reconcile target counts. Ambiguous rows must remain in a manual queue.

No target row was invented or silently dropped.
