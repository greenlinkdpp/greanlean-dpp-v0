# Phase 5 Open Issues

No issue blocks Phase 5 acceptance.

Deferred by the Phase 5 boundary:

- Production Registry credentials/endpoints and certification;
- real ERP/MES/PLM vendor-specific adapters;
- Production queue/worker scheduling and multi-region execution;
- Production KMS/vault provider wiring and credential rotation operations;
- VC/Wallet, UNTP, Catena-X/EDC, Production migration and traffic cutover;
- organization-wide metrics backend and alert routing;
- optional XLSX import support.

Known Development fixture issue:

- `supabase/seeds/v1_development_reference_products.sql` currently trips the historical P0 function `greanlean_p0_validate_battery_hierarchy()` when the trigger runs on `battery_batch`, because the shared PL/pgSQL function references `NEW.battery_batch_id`, a column that exists only on `battery_item`. The seed transaction rolled back cleanly. This predates Phase 5 and does not affect the Phase 5 integration tables, V1 table availability, compiled application, or existing runtime records. Fix it in a separately approved additive database maintenance migration; do not rewrite applied migration `0025` in place.

Operational acceptance should decide provider implementations, worker topology, alert thresholds and Registry/BMS vendor onboarding before any Production enablement.
