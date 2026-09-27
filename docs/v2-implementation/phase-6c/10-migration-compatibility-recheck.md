# Migration and Compatibility Recheck

## PreProd migration state

- PreProd head: `0034`.
- Rate-limit table: present with RLS.
- Atomic limiter RPC: present and service-role restricted.
- Stable hosted Resolver allowlist row: 1.
- Flattened active hosted mappings for the selected Pilot Passport: 7.
- Pilot DPP ID, GTIN, and legacy alias all resolve on Hosted PreProd.

## Legacy decision counts

```text
mapped = 0
excluded-from-pilot = 5
blocking quarantine in Pilot = 0
unknown in Pilot = 0
```

The five exclusions neither mutate V1 nor enter automatic V2 migration. The selected Pilot Passport is deterministic. Official QR paths remain compatible and unapproved destinations are rejected.

Production was checked read-only and remains migration head `0026`; no Production migration or data write occurred.

```text
MIGRATION_GATE = PASS
COMPATIBILITY_GATE = PASS
```
