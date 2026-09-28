# Production Migration Evidence

```text
PRODUCTION_SCHEMA_MIGRATION = PASS
PRODUCTION_MIGRATION_HEAD_BEFORE = 0027
PRODUCTION_MIGRATION_HEAD_AFTER = 0035
MIGRATION_BEYOND_0035 = NO
```

The exact frozen RC SQL was applied sequentially. No new or modified migration was introduced.

| Migration | SHA-256 | Ledger applied_at | Source ledger environment |
|---|---|---|---|
| `0028_v2_phase2_product_core.sql` | `a41d7de9e22c63507d3618dcf86cf0e70c4d43d2f9304d62956d195ea6ed5672` | `2026-09-28T00:13:54.83087Z` | `development` |
| `0029_v2_phase3_schema_canonical_provenance.sql` | `ea6a32617fa55412832c18ad0b809329d29c6bbbdf5fe12c943f49e5e1f27f6f` | `2026-09-28T00:14:00.089498Z` | `development` |
| `0030_v2_phase4_passport_publication_resolver.sql` | `2772914292ba5e6367755b210a28a0ec6459fac183d83cf61af65e6476d4310b` | `2026-09-28T00:14:05.468449Z` | `development` |
| `0031_v2_phase5_integration_registry_connectors.sql` | `b9c1c3f25f81fcbb914662cb53dc9bfcf19132d69235cb47f278050da74f32ff` | `2026-09-28T00:14:10.332994Z` | `development` |
| `0032_v2_phase6_seed_trigger_compatibility_fix.sql` | `624f9079e18c94f19dea0993c91759ba2fdbeb3498574479102e5acc387e4b18` | `2026-09-28T00:14:15.307904Z` | `development` |
| `0033_v2_phase6b_future_tenant_connector_capabilities.sql` | `8a9807ea8caa51801d51ccd27141a7b0c9d47a932e62c69b546ff781fea3b6b6` | `2026-09-28T00:14:19.914806Z` | `preproduction` |
| `0034_phase6c_hosted_pilot_controls.sql` | `480377579ff39cf797e6c29560b33d8e65c502436af81e1a04d73f1e77f1de1d` | `2026-09-28T00:14:24.63294Z` | `preproduction` |
| `0035_phase6c_resolver_fast_path.sql` | `3aa2eb054318d7b27f450f09345952583746559246c3a8cb680a0d290ed20cb6` | `2026-09-28T00:14:29.417505Z` | `preproduction` |

Final read-only verification found all eight ledger rows, head `0035`, `public.v2_resolve_public_passport(...)`, and the hosted rate-limit function `public.v2_phase6c_consume_public_rate_limit(text,text,integer,integer)`. The environment values above are hard-coded in the verified RC and were preserved exactly.

The schema deployment did not deploy application code, enable a feature flag, switch traffic, activate Registry/connectors or migrate Pilot business data.
