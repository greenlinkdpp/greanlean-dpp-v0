# Phase 7 Production Change Request

```text
CHANGE_REQUEST_STATUS = DRAFT
PRODUCTION_WRITE_AUTHORISED = NO
PRODUCTION_SCHEMA_MIGRATION_AUTHORISED = NO
PILOT_CUTOVER_AUTHORISED = NO
```

## Change scope

Prepare a controlled V1/V2 coexistence cutover for exactly one user-selected Pilot Tenant. The proposed schema range is Production migration head `0026` through the Phase 6 verified PreProd head `0035`. No Production migration, V2 data write, feature-flag change, Registry activation, connector activation, or traffic switch is authorised by this draft.

## Proposed migration range

| Migration | SHA-256 |
|---|---|
| `0027_v2_phase1_tenant_access_foundation.sql` | `15a2984852d2c94517876102f673f563fdb19060df37cf569753235e6504ecc0` |
| `0028_v2_phase2_product_core.sql` | `a41d7de9e22c63507d3618dcf86cf0e70c4d43d2f9304d62956d195ea6ed5672` |
| `0029_v2_phase3_schema_canonical_provenance.sql` | `ea6a32617fa55412832c18ad0b809329d29c6bbbdf5fe12c943f49e5e1f27f6f` |
| `0030_v2_phase4_passport_publication_resolver.sql` | `2772914292ba5e6367755b210a28a0ec6459fac183d83cf61af65e6476d4310b` |
| `0031_v2_phase5_integration_registry_connectors.sql` | `b9c1c3f25f81fcbb914662cb53dc9bfcf19132d69235cb47f278050da74f32ff` |
| `0032_v2_phase6_seed_trigger_compatibility_fix.sql` | `624f9079e18c94f19dea0993c91759ba2fdbeb3498574479102e5acc387e4b18` |
| `0033_v2_phase6b_future_tenant_connector_capabilities.sql` | `8a9807ea8caa51801d51ccd27141a7b0c9d47a932e62c69b546ff781fea3b6b6` |
| `0034_phase6c_hosted_pilot_controls.sql` | `480377579ff39cf797e6c29560b33d8e65c502436af81e1a04d73f1e77f1de1d` |
| `0035_phase6c_resolver_fast_path.sql` | `3aa2eb054318d7b27f450f09345952583746559246c3a8cb680a0d290ed20cb6` |

The range is additive and rollback-aware according to the Phase 6 migration suite (`56/56` passing). The `DELETE` in migration `0030` is scoped current-pointer maintenance inside the approved publication workflow, not a V1 table mutation. A final checksum comparison is still required immediately before any approved Production migration.

## Required details before approval

- Pilot Tenant: `SOODOO E-bike`
- Pilot Tenant ID / existing identifier: `NOT_FOUND_IN_EXISTING_CANONICAL_DATA`
- Pilot business owner: `GreanLean Platform Owner / 聂松伟`
- Pilot technical contact: `GreanLean Platform Owner / 聂松伟`
- Included Models and Passports: `SCOPE_LOCK_REQUIRED`
- Maintenance/cutover window: `NOT_SCHEDULED`
- Current managed backup ID and timestamp: `MUST_BE_RECONFIRMED_IMMEDIATELY_BEFORE_WRITE`
- Rollback reference: `MUST_BE_RECORDED_IMMEDIATELY_BEFORE_WRITE`
- Cutover owner: GreanLean Platform Owner, subject to Pilot-specific confirmation
- Rollback owner: GreanLean Platform Owner, subject to availability confirmation
- Monitoring owner: GreanLean Platform Owner, subject to availability confirmation

## Expected changes and writes

- Apply only migrations `0027`–`0035`, in order, after approval.
- Create only the selected Tenant's V2 representation and deterministic mappings.
- Publish only approved Pilot Passports through the Candidate → Review → Approval → immutable Version → Current Pointer workflow.
- Keep `GLOBAL_V2_PRIMARY = FALSE` and keep every non-Pilot Tenant on V1.
- Keep Production Registry disabled and real customer connectors inactive unless separately approved.

## Rollback mechanism

The primary cutover rollback is `PILOT_TENANT_V2_PRIMARY = FALSE`. Additive V2 schema and audit evidence remain in place. Any V2-only writes must be frozen and reconciled; they must not be silently discarded.

## Stop conditions

- Missing explicit Pilot Tenant selection or scope.
- Change request not explicitly approved.
- Release Candidate not frozen from the Phase 6 verified tree.
- Missing or stale managed backup, missing rollback point, or unavailable owners.
- Unexpected Production baseline, migration checksum, or migration head.
- V1 regression, shadow mismatch, security regression, cross-tenant anomaly, or cutover smoke failure.

## Validation checklist

- [x] Phase 6 final report says complete/pass and Production/Pilot ready.
- [x] Critical and unaccepted High risks are zero in the superseding Phase 6 report.
- [x] Exact proposed migration filenames and current repository checksums recorded.
- [x] Pilot Tenant and human contacts explicitly supplied by the user.
- [ ] Canonical existing SOODOO Tenant ID resolved; current result is no match.
- [ ] One-Tenant model/passport/identifier scope locked.
- [ ] Clean, immutable Release Candidate recorded.
- [ ] Fresh Production baseline and managed backup reconfirmed.
- [ ] User changes this request to `CHANGE_REQUEST_STATUS = APPROVED`.

No Production change may proceed while this document is `DRAFT`.
