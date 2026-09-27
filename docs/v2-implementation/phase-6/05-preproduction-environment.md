# Pre-Production environment

## Required topology

Pre-Production must have independent Supabase Database/Auth/Storage, secrets, Vercel environment/deployment, connector credentials, and project reference. Its reference must differ from both Production (`3ce843a277e6`) and Development (`7b8e1c72db01`) fingerprints.

## Current result

```text
PREPRODUCTION_ISOLATED = FALSE
```

No third project was created. The current Supabase Free organisation has the documented two-active-project limit and presently contains Production and Development. Creating or upgrading paid infrastructure would incur an external account/billing change and was not authorized. Development is not accepted as a substitute.

## Creation checklist

1. Infrastructure Owner selects a paid plan/organisation and creates a third project in an approved region.
2. Record only safe identity fingerprints; never copy Production service credentials.
3. Create a dedicated Vercel Pre-Production environment and domain.
4. Apply repository migrations from a clean database and verify the ledger.
5. Seed only synthetic, Production-like data; Production-derived data requires documented sanitization and approval.
6. Configure separate Storage buckets, Auth settings, connector secrets, and TEST-only Registry credentials.
7. Run migration, shadow compare, load, security, failure, rollback, and observability exercises.

Status: **BLOCKED** pending Infrastructure/Billing Owner action.
