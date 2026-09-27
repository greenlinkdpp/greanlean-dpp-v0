# Phase 4 implementation summary

Phase 4 converts a Phase 3 Resolved Candidate into a reviewed, immutable and publicly resolvable DPP. The implemented chain is:

`Resolved Candidate → Review → Approval → DPP Version → Current Pointer → Resolver → Audience Projection → HTML / JSON / JSON-LD / PDF / QR`.

The implementation is Development-only and feature-gated. Production was not changed.

## Existing publication reuse assessment

| Existing object | Decision | Reason |
|---|---|---|
| `dpp_publication` | ADAPT / V1 compatibility | Reuses immutable snapshot concepts but is bound to legacy `products.id`, a text schema version and the legacy nine-module snapshot. |
| `dpp_product_publication_pointer` | REUSE PATTERN | Its single-current-pointer and atomic update semantics informed `dpp_current_pointer`. |
| `dpp_publication_review` | ADAPT | Preserved for V1; it cannot bind a Phase 3 Candidate Hash and UUID Schema Version to a Phase 2 subject. |
| `product_versions` | RETAIN V1 | Not used as the V2 DPP version authority. |
| legacy public snapshot RPC | RETAIN V1 | V1 compatibility only; V2-primary Passports never use it as a live fallback. |
| canonical JSON/hash implementation | REUSE | `canonicalHash` remains the JCS-style canonical JSON + SHA-256 implementation. |

New V2 objects are `dpp_passport`, `dpp_review_task`, `dpp_version`, `dpp_current_pointer`, `resolver_mapping`, and `dpp_publication_audit`. `dpp_version.legacy_publication_id` is the explicit compatibility bridge.

Migration: `0030_v2_phase4_passport_publication_resolver.sql`; rollback: matching `0030` down migration.

