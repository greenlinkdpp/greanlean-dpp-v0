# Phase 7 Pilot Scope Lock

```text
PILOT_TENANT_SELECTION_RECEIVED = TRUE
PILOT_TENANT_SELECTED = TRUE
PILOT_SCOPE_LOCKED = FALSE
PILOT_TENANT_PROVISIONING_REQUIRED = FALSE
SOODOO_TENANT_PROVISIONING = PASS
PILOT_TENANT_ID = 0c2f6dff-560d-4eeb-be47-1e87a2f710fe
PRODUCTION_WRITE_PERFORMED = YES_LIMITED_TO_0027_AND_TENANT_BOUNDARY
```

| Required field | Current value |
|---|---|
| Pilot Tenant | `SOODOO E-bike` |
| Canonical Production Tenant ID | `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| Tenant code | `soodoo-e-bike` |
| Tenant status | `ACTIVE` |
| Created at | `2026-09-27T23:58:55.70031Z` |
| Pilot business owner | `GreanLean Platform Owner / 聂松伟` |
| Pilot technical contact | `GreanLean Platform Owner / 聂松伟` |
| Organisation relationship | none; no existing SOODOO Organisation was found and none was invented |
| Membership | none; no Auth identity was inferred from a display name |
| Included Models | `NOT_YET_LOCKED` |
| Included Passports | `NOT_YET_LOCKED` |
| Included identifiers | `NOT_YET_LOCKED` |
| Excluded legacy rows | The five Phase 6 ambiguous rows remain `EXCLUDE_FROM_PILOT` |
| Observation start/end | `NOT_SCHEDULED` |

Tenant selection is complete, but the full Pilot scope remains unlocked until the exact included Models, Passports and identifiers are approved. Limits remain one Tenant, no more than 30 Models and no more than 5,000 Passports.

Migration `0027` and provisioning evidence are recorded in `01a-production-0027-migration-evidence.md` and `01b-soodoo-tenant-provisioning-evidence.md`. The earlier `01a-soodoo-tenant-provisioning-evidence.md` is retained as historical evidence of the correctly blocked pre-schema attempt.
