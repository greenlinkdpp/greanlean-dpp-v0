# 08 Phase 1 V1 Regression Results

## Status

PASS — V1 REMAINS GREEN

Validation completed on 2026-09-25 after the final Phase 1 UP.

| Check | Result |
|---|---|
| repository hygiene (scripts/lint.mjs) | PASS |
| TypeScript (tsc --noEmit) | PASS |
| migration/rollback contract suite | 32/32 PASS |
| unit/integration suite | 151/151 PASS |
| Next production build | PASS; 42 static pages and all V1/V2 dynamic routes collected |
| 0027 rollback | PASS; V2 tenant returned 404 and ledger row count became 0 |
| V1 after rollback | PASS; 151/151 local tests |
| live representative V1 REST tables after rollback | 10/10 HTTP 200 |

Live V1 tables checked after rollback: products, dpp_publication, dpp_file_asset, dpp_lifecycle_event, dpp_organisation, dpp_project, battery_item, battery_operating_metric, schema_version, and field_definition.

Migration 0027 contains no V1 ALTER, rename, drop, key rewrite, or data rewrite. Production routes, flags, URL/QR behavior, database, Storage, Auth, and secrets were not changed.

