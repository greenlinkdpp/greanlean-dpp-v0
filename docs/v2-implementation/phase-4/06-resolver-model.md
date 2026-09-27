# Resolver model

The Resolver chain is `external identifier/path → resolver_mapping → dpp_passport → dpp_current_pointer → immutable dpp_version → projection`.

Mappings support `PRIMARY`, `ALIAS`, and `LEGACY_REDIRECT`, with validity windows, retirement states and bounded alias chains. Active host + normalized path is unique. A historical path cannot be reassigned to another logical Passport. Host allowlisting rejects open redirects; cross-Tenant foreign keys reject cross-Tenant mapping; maximum alias depth is eight.

Phase 2 identifiers are linked by `identifier_id`, so DPP ID, GTIN, UPI, serial, model code and SKU use one identifier authority. Legacy slug, legacy DPP ID, named aliases, `/01/{gtin}` and old URL paths use explicit compatibility mappings.

Registry status is never consulted by the Resolver and cannot change Passport identity, canonical URL or QR target.

