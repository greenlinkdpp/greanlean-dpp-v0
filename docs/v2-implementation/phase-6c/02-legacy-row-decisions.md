# Legacy Row Decisions

## Decision rule

No SKU semantics, model relationship, or V2 mapping is inferred. These records are synthetic/demo PreProd records and are outside the single-passport Pilot scope. Their V1 rows remain unchanged and automatic V2 migration writes zero records for them.

| Record identifier | Current legacy value | Detected ambiguity | Recommended business interpretation | Business owner decision | Final disposition |
|---|---|---|---|---|---|
| `0f09ff28-37ce-4a87-9590-b3fb99154f1b` | GreenVault ESS-14.3; SKU `GV-ESS-14K3-2026`; DPP `DPP-GV-ESS-14K3-000001` | `products.sku` may identify a model, sellable SKU, or instance | Preserve V1 identity until an owner defines its product hierarchy | No mapping decision supplied; exclusion is allowed by the Phase 6C rule | `EXCLUDE_FROM_PILOT` |
| `41c77aa2-a8d6-4a8f-a5c8-d9bd6f34c946` | WPC PLANK; SKU `MS140K25B`; DPP `DPP-WPC-MS140K25B` | Model/SKU granularity is not evidenced | Do not infer model-to-SKU cardinality | No mapping decision supplied | `EXCLUDE_FROM_PILOT` |
| `6d3b043b-8104-43b2-a229-132c50638f45` | Organic Cotton T-Shirt; SKU `GL-TSHIRT-001`; DPP `DPP-TEX-TSHIRT-001` | Product/model/batch level is ambiguous | Keep the legacy record intact pending taxonomy ownership | No mapping decision supplied | `EXCLUDE_FROM_PILOT` |
| `a0de52dc-8655-4339-b7b6-c9a6940f9697` | 48V 15Ah synthetic battery; SKU `GL-LMT-BAT-48V15AH`; DPP `DPP-LMT-BAT-48V15AH` | Synthetic row does not prove sellable hierarchy | Treat as test data, not a Pilot mapping source | No mapping decision supplied | `EXCLUDE_FROM_PILOT` |
| `c2747230-24a9-4eb5-8b2c-6380391e8c40` | Wireless Earbuds; SKU `GL-EARBUDS-001`; DPP `DPP-CE-EARBUDS-001` | Model and unit scope cannot be determined | Retain V1 only until an owner supplies semantics | No mapping decision supplied | `EXCLUDE_FROM_PILOT` |

## Reconciliation

```text
mapped count = 0
excluded-from-pilot count = 5
quarantined count within Pilot = 0
unknown count within Pilot = 0
LEGACY_ROW_DECISION = PASS
```

The Pilot scope is the already-published V2 passport `DPP-P4-MUJEZBWJ140310` for tenant `11111111-1111-4111-8111-111111111111`. None of the five rows is required by or connected to that Passport.
