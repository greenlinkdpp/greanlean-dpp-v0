# Passport identity model

`dpp_passport` is stable identity; `dpp_version` is released content. A Passport belongs to one Tenant and one Phase 2 subject (`MODEL`, `SKU`, `BATCH`, or `ITEM`). Its default profile is `PRIMARY`; additional profile codes can coexist, with at most one active Passport per Tenant, subject and profile.

Core identity fields (`tenant_id`, subject, identifier, Schema Definition and publication source) are database-immutable. Only identity-level lifecycle metadata such as `status` and profile metadata exposed by the API can be patched. Version payload is never patchable through the Passport API.

Phase 2 `product_subject_identifier` remains the sole identifier authority. Phase 4 enables only `DPP_ID + PASSPORT`, normalizes it with the existing function, and enforces active global uniqueness. Passport identity is independent of all DPP versions.

`publication_source` is explicit:

- `V1`: compatibility may be handled by an explicit mapping or adapter.
- `V2`: live V1 fallback is forbidden.

