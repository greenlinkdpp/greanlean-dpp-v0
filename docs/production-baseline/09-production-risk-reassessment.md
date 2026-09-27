# 09 Production Risk Reassessment

## Reassessment rule

Risk is reduced only by Production evidence. Repository controls are recorded as mitigating design, not as proof that the control is installed or operating.

| Risk | Prior | Production evidence | Revised | Reason |
|---|---|---|---|---|
| R-02 legacy Tenant ownership | Critical | ownership table exists but counts/coverage unavailable | **Critical** | unknown/unowned/multi-owned totals not verified |
| R-03 RLS inconsistency | Critical | anon publication/ownership denials; policy metadata unavailable | **Critical** | no authenticated cross-tenant test or policy export |
| R-04 Partner unauthorized access | Critical | no first-class Partner–Tenant authorization | **Critical** | architectural gap remains |
| R-12 publication overwrite/multiple sources | Critical | public pages work; repository retains live fallback | **Critical** | immutable source not proven in Production |
| R-14 arbitrary QR URL | High | repository endpoint accepts URL; deployed endpoint not invoked | **High** | no allowlist/control evidence |
| R-15 old QR failure | High | existing QR inventory unavailable | **High** | compatibility population unknown |
| R-16 resolver/URL inconsistency | High | aliases, GS1, code redirects remain distributed | **High** | no unified Production inventory |
| R-21 secret exposure | Critical | sampled root chunks contain no local service-role value/name | **High** | useful negative sample, but Production secret inventory/rotation unknown |
| R-24 file cross-tenant leak | Critical | authorization code and short signed URL exist; storage policies not visible | **Critical** | service-role path and Production RLS untested |
| R-29 backup not recoverable | Critical | no backup/PITR/restore evidence | **Critical** | `RESTORE NOT PROVEN` |
| R-30 production interruption | Critical | public service reachable; no rollback/deploy evidence | **Critical** | commit, deployment and recovery baseline unknown |
| R-32 schema drift | High | key table presence partially observed; ledger/catalog unavailable | **Critical** | Production schema equality cannot be established |
| R-33 observability gap | High | JSON logger/correlation code exists; sinks, metrics and alerts unknown | **High** | runtime operational evidence absent |

## Additional observations

### Public data scale

Anonymous exact-count headers exposed only the public projection:

| Relation | Public-visible count |
|---|---:|
| `products` | 8 |
| `schema_definition` | 7 |
| `schema_version` | 7 |
| `field_definition` | 112 |
| `product_sector_field_values` | 19 |
| `battery_model_profile` | 2 |
| organisation/batch/item/metric/file/lifecycle sampled tables | 0 |

These numbers are not total Production counts and cannot support migration sizing.

### Observability baseline

| Capability | Repository evidence | Production evidence | Status |
|---|---|---|---|
| structured logs | JSON logger with sensitive-key redaction | log sink unavailable | NOT VERIFIED |
| correlation ID | wrapped API routes emit `x-correlation-id` | no safe runtime API sample covering all routes | PARTIAL/UNKNOWN |
| error tracking | no dedicated provider found | management view unavailable | NOT VERIFIED |
| request latency/5xx metrics | duration written in wrapper logs | dashboards unavailable | NOT VERIFIED |
| auth/RLS deny visibility | application decisions can log; database visibility unknown | unavailable | NOT VERIFIED |
| storage/Registry/BMS error monitoring | structured errors exist in code | alerts unavailable | NOT VERIFIED |
| uptime monitoring | public endpoints were reachable in this sample | monitor/alert ownership unavailable | NOT VERIFIED |
| alert routing/runbooks | repository does not establish complete setup | unavailable | NOT VERIFIED |

The code-level logger is a useful base, but it does not prove centralized retention, alert thresholds, on-call ownership, or that every legacy route uses the wrapper.

### Required production aggregates

The following remain **NOT VERIFIED**: Tenant/organisation/user/product totals, unique/no/multiple ownership counts, SKU uniqueness, batch/item mismatch, duplicate serials, DPP state/pointer/orphan/hash anomalies, storage objects, lifecycle events, and BMS metrics.

## Immediate risk controls before parallel implementation touches Production-connected paths

1. Obtain a management-approved read-only Production evidence channel.
2. Export migration/catalog/RLS metadata and prove the deployed commit.
3. Confirm backup/PITR and complete an isolated restore exercise.
4. Freeze and inventory public URLs/QR/API consumers.
5. Define Phase 1 so every new V2 table is additive and disabled by default.
6. Run all tenant/RLS negative tests in staging before any Production DDL request.

## Residual-risk conclusion

Architecture design and isolated local development can proceed. Production-connected implementation, migration rehearsal against Production data, or cutover planning cannot be considered safe until the Critical evidence gaps are closed.
