# Phase 5 EU DPP Registry Test Adapter

## Scope

Phase 5 adds a server-managed preparation workflow for the EU DPP Registry. It
does not integrate an unpublished battery API contract and does not claim that
a battery DPP has been registered successfully.

The adapter currently supports:

- versioned battery-to-Registry TEST mappings;
- local pre-submission validation;
- JSON mapping-file download for manual TEST upload;
- manual submission, rejection, and failure result recording;
- redacted Registry error records and retry chains;
- append-only validation, error, and proof evidence;
- strict TEST and PRODUCTION record separation.

## Mapping Boundary

The generated artifact contains product group, granularity, DPP/passport and
UPI identifiers, model/batch/item identifiers where applicable, commodity
code, public DPP URI, version, and SHA-256 hash. It does not copy the complete
BatteryPass 100-field dataset into the Registry payload.

The mapping version is `battery-test-file-1.0.0` and is bound to the current
Registry User Guide operational rules. `registry_schema_version` remains null
until an official battery semantic catalogue is available.

## Safety Rules

- The application endpoint only creates `TEST` records.
- `PRODUCTION` is not exposed in the workbench.
- A battery record cannot become `ACCEPTED` while its official Registry Schema
  version is null.
- Local readiness means that a TEST file can be prepared; it is not proof of
  factual accuracy, legal compliance, submission, or registration.
- Registry responses are redacted before error details are persisted.
- Browser clients cannot read or write the new Registry tables directly; all
  operations pass through authenticated server routes using RLS-bypassing
  server credentials.

## Database And Routes

Migration `0011_registry_adapter.sql` creates:

- `registry_mapping`
- `registry_organisation_enrolment`
- `registry_submission`
- `registry_validation_result`
- `registry_error_log`
- `registry_registration_proof`

Authenticated server routes:

```text
GET  /api/registry/:productId
POST /api/registry/:productId
GET  /api/registry/:productId/export/:submissionId
```

## Activation

1. Apply `0011_registry_adapter.sql` after Phase 4 migrations.
2. Run `supabase/bundles/battery_dpp_preview_verify.sql`; every row must pass.
3. Set `FEATURE_REGISTRY_ADAPTER=true` only in Preview/Test.
4. Redeploy and validate the battery workflow's Registry step with an
   authenticated account.

Disable `FEATURE_REGISTRY_ADAPTER` for application rollback. Run the down
migration only in a disposable database with no Registry business records.
