# Round G0.1 — Manifest table mapping correction

The G0 source manifest was regenerated from read-only PreProd and Production
schema inspection. The former `product_sku` alias was replaced with the actual
`sku` table everywhere in the source inventory and Production promotion plan.

- `sku` exists in both environments; `product_sku` exists in neither.
- All 18 manifest tables and all captured source columns exist in both
  environments.
- The actual source inventory is 190 rows, not 189: one real `sku` row had
  been omitted by the invalid alias. No business row was altered.
- The revised plan has 15 insert tables, 3 reuse tables, and no update tables.
- Dependency order is: tenant/schema references, organisations, family, model,
  SKU and batch (parallel model children), item, identifiers/relations,
  passport/review/version/current pointer, resolver/audit/catalogue entries.
- Collision audit found no unresolved future-identifier collision. Existing
  model/item business keys remain explicitly reusable mappings.

No Production mutation or application deployment occurred in this round.
