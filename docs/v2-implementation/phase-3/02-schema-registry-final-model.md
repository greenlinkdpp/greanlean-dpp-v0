# Schema Registry Final Model

The existing `schema_definition`, `schema_version`, `field_definition`, `validation_rule`, `applicability_rule`, `access_policy`, `codelist`, and regulatory-reference tables remain the only Schema authority.

`schema_definition` now distinguishes `GLOBAL` and `TENANT_EXTENSION` ownership. Global definitions have no Tenant; extensions require one. Tenant actors can read global definitions plus their own extensions, but cannot modify global definitions.

Published Schema versions retain the pre-existing immutability triggers. New Tenant extensions and draft versions can be created without rewriting historical global definitions. Legacy published Field rows are not backfilled or mutated; the service adapter derives their subject level from `data_granularity` when `semantic_name` is absent.

The Phase 3 rollback deletes Phase 3-owned Tenant extensions, restores Phase 2 Schema policies, and removes only the additive columns and indexes.
