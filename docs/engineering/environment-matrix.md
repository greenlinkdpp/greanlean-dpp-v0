# Environment Matrix

| Environment | App host | Database | Writes | Registry | Purpose |
|---|---|---|---|---|---|
| Local | localhost | local or dedicated dev | allowed | mock/off | development |
| Preview | Vercel preview | dedicated preview | allowed | test only | review and smoke tests |
| Test | controlled test host | disposable test copy | allowed | EU test when approved | integration and migration rehearsal |
| Production | greanlean.com | production | approved releases only | disabled until approved | live service |

## Rules

- Preview and test deployments must never use production write credentials.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is browser-visible and depends on RLS.
- `SUPABASE_SERVICE_ROLE_KEY` and Registry credentials are server-only secrets.
- Real secrets belong in `.env.local` or the hosting secret store, never Git.
- `DPP_ENVIRONMENT` must match the database and Registry target.
- Additive features default to off and are enabled only after their migration,
  rollback rehearsal, tests, and product approval pass.

## Feature Flags

| Variable | Default | Scope |
|---|---|---|
| `NEXT_PUBLIC_FEATURE_SCHEMA_REGISTRY` | false | new Schema-driven UI reads |
| `NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2` | false | future battery workflow |
| `FEATURE_SERVER_API_V2` | false | new server-side write boundary |
| `FEATURE_REGISTRY_ADAPTER` | false | Registry adapter; test first |
