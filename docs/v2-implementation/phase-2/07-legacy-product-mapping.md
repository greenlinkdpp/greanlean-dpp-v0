# 07 Legacy Product Mapping

Phase 2 provides a classification adapter only. It does not rewrite V1 rows or migrate Production data.

| Legacy source | Candidate | Rule |
|---|---|---|
| `products` without SKU value | Model | `MAPPED` |
| `products` with independently verified SKU semantics | SKU | `MAPPED` |
| `products.sku` with ambiguous semantics | Model only | `REVIEW_REQUIRED`; never auto-create SKU |
| `battery_model_profile` | Model | identity only |
| `battery_batch` | Batch | Model-owned; no automatic SKU link |
| `battery_item` | Item | identity/hierarchy only |
| unsupported source | none | `REJECTED` |

This adapter deliberately separates mapping classification from persistence. Ambiguous data remains reviewable and no source fact is invented.

