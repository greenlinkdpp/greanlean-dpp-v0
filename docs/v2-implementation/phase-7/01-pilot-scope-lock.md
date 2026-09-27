# Phase 7 Pilot Scope Lock

```text
PILOT_TENANT_SELECTION_RECEIVED = TRUE
PILOT_TENANT_SELECTED = FALSE
PILOT_SCOPE_LOCKED = FALSE
PILOT_TENANT_PROVISIONING_REQUIRED = TRUE
SOODOO_TENANT_PROVISIONING = FAIL
PILOT_TENANT_ID = null
PRODUCTION_WRITE_PERFORMED = NO
```

The user explicitly selected `SOODOO E-bike` and supplied both required human contacts, but required reuse of an existing canonical Tenant ID. Read-only resolution found no SOODOO match in either the existing Production V1 organisation/product model or the verified PreProd V2 Tenant/Organisation model. No ID was invented or manually assigned, so execution stops before any Production write.

| Required field | Current value |
|---|---|
| Pilot Tenant | `SOODOO E-bike` |
| Pilot Tenant ID / existing identifier | `NOT_FOUND` |
| Pilot business owner | `GreanLean Platform Owner / 聂松伟` |
| Pilot technical contact | `GreanLean Platform Owner / 聂松伟` |
| Included Models | `NOT_EVALUATED` |
| Included Passports | `NOT_EVALUATED` |
| Included identifiers | `NOT_EVALUATED` |
| Excluded Models | `NOT_EVALUATED` |
| Excluded legacy rows | The five Phase 6 ambiguous rows remain `EXCLUDE_FROM_PILOT` |
| Cutover owner | `CONFIRM_AVAILABILITY_AFTER_SELECTION` |
| Rollback owner | `CONFIRM_AVAILABILITY_AFTER_SELECTION` |
| Observation start/end | `NOT_SCHEDULED` |

## Canonical resolution evidence

The check used server-side read-only REST access and searched complete bounded table contents for the case-insensitive token `soodoo`:

| Environment | Resource | Rows checked | SOODOO matches |
|---|---|---:|---:|
| Verified PreProd | `tenant` | 2 | 0 |
| Verified PreProd | `organisation_v2` | 3 | 0 |
| Verified PreProd | `dpp_organisation` | 1 | 0 |
| Verified PreProd | `dpp_project` | 0 | 0 |
| Verified PreProd | `products` | 5 | 0 |
| Production | `tenant` | not present at migration head `0026` | 0 |
| Production | `organisation_v2` | not present at migration head `0026` | 0 |
| Production | `dpp_organisation` | 3 | 0 |
| Production | `dpp_project` | 0 | 0 |
| Production | `products` | 9 | 0 |

Limits remain fixed at one Tenant, no more than 30 Models, and no more than 5,000 Passports. The five Phase 6 ambiguous legacy rows remain excluded. A separately authorised provisioning decision is required before the scope can be locked.

## Provisioning authorization result

The user subsequently authorised only the minimum canonical SOODOO Tenant/Organisation boundary records, while explicitly prohibiting migrations `0027`–`0035` and every V2 schema deployment. Production is still at migration head `0026`. The approved Phase 1 `tenant` and `organisation_v2` tables are created by migration `0027` and do not exist in Production (`PGRST205`).

Creating the requested record would therefore first require a prohibited schema migration. Falling back to `dpp_organisation`, inventing an alternate table, or manually assigning an ID would violate the authorization. Provisioning was not attempted, no Tenant ID exists, and the scope remains unlocked. Detailed evidence is in `01a-soodoo-tenant-provisioning-evidence.md`.
