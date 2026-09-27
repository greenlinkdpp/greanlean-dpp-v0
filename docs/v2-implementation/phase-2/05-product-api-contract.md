# 05 Product API Contract

The combined Phase 1/Phase 2 contract is in `docs/v2-implementation/phase-1/openapi-v2.yaml` and validates as YAML.

| Resource | Operations | Read capability | Write capability |
|---|---|---|---|
| `/api/v2/product-families` | list, create | `product.view` | `product.edit` |
| `/api/v2/product-families/{id}` | read, update/archive | `product.view` | `product.edit` |
| `/api/v2/product-models` | list, create | `product.view` | `product.edit` |
| `/api/v2/product-models/{id}` | read, update/archive | `product.view` | `product.edit` |
| `/api/v2/skus` and `/{id}` | list/create/read/update/archive | `product.view` | `product.edit` |
| `/api/v2/batches` and `/{id}` | list/create/read/update/archive | `product.view` | `product.edit` |
| `/api/v2/items` and `/{id}` | list/create/read/update/archive | `product.view` | `product.edit` |
| `/api/v2/batch-sku-links` | list, create | `product.view` | `product.edit` |
| `/api/v2/batch-sku-links/{id}/deactivate` | deactivate | — | `product.edit` |
| `/api/v2/identifiers` | list, create | `product.view` | `identifier.manage` |
| `/api/v2/identifiers/{id}` | read | `product.view` | — |
| `/api/v2/identifiers/{id}/retire` | retire | — | `identifier.manage` |

Responses use the shared Phase 1 envelope, correlation ID, safe errors, private/no-store cache policy, feature flag `FEATURE_V2_PRODUCT_CORE`, and persistent idempotency for every mutation.

