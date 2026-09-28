# Pilot Data Reconciliation

```text
PILOT_DATA_RECONCILIATION = BLOCKED
PILOT_SCOPE_LOCKED = FALSE
PILOT_MODEL_COUNT = 0
PILOT_PASSPORT_COUNT = 0
PILOT_DATA_WRITE_PERFORMED = NO
BLOCKER = PILOT_SCOPE_NOT_LOCKED_AND_NO_DETERMINISTIC_SOODOO_SOURCE
```

The canonical Tenant exists, but the approved scope does not identify any included Model, Passport or identifier. Production contains zero SOODOO V2 Product Models and zero SOODOO V2 Passports. Earlier collision/source searches found no canonical SOODOO Organisation or legacy customer/product representation that can be assigned to this Tenant without inference.

Consequently no deterministic chain of `V1 source → V2 subject → identifier → passport` can be constructed. Inventing records, assigning unrelated legacy products or treating the Tenant display name as a data-selection rule would violate the scope-lock and reconciliation requirements. The five Phase 6 ambiguous legacy rows remain `EXCLUDE_FROM_PILOT`.

No Pilot data migration, backfill, publication or feature-flag write was attempted. Continuation requires an explicit list or deterministic source-selection rule for the included SOODOO Models, Passports and identifiers.
