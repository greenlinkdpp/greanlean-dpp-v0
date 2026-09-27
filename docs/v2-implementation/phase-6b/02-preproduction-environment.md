# PreProduction Environment

## Identity and isolation

- Supabase project: `greanlean-dpp-preprod`
- Project ref: `efhiaufukjchxqhbmpvq`
- Organisation: `GreanLean Dev`
- Region: Singapore
- Compute: Nano / Free-project capacity
- State at verification: `ACTIVE_HEALTHY`
- Local environment file: `.env.preproduction.local`, mode `0600`, not committed
- Guard fingerprint: `d465ccdd1809`

The environment guard rejects Production, and all mutation scripts record:

- `productionWritePerformed: false`
- `productionTrafficSwitched: false`

## Initialization

The environment was built from an empty project using:

1. `supabase/schema.sql` for the legacy V1 schema bootstrap.
2. Historical reference fixtures required by numbered migrations.
3. Repository migrations through `0033_v2_phase6b_future_tenant_connector_capabilities.sql`.
4. Synthetic development/reference data only.

The replay runner is resume-safe and accepts only the exact expected ledger prefix. Evidence is in `evidence/preproduction-migration-replay.json`.

## Runtime boundary

There is no hosted PreProd frontend yet. Verification used a local Next.js production build bound to the isolated PreProd backend. Results therefore establish application and database behavior, but not hosted-edge or Production-plan behavior.

`greanlean-dpp-dev` remains paused. Production was not transferred, paused, migrated, or modified.
