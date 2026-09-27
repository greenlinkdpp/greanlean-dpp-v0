# 06 Production Secrets and Integrations

## Handling statement

No secret value is included in this report. The service-role key was not used. Production environment-variable settings were not modified or fetched from a management API.

## Secret inventory

| Secret/config name | Environment/location observed | Client exposed? | Rotation evidence | Production risk |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | local `.env.local` | intentionally public | n/a | target classification NOT VERIFIED |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local `.env.local` | intentionally public, protected by RLS | NOT VERIFIED | High if RLS assumptions fail |
| `SUPABASE_SERVICE_ROLE_KEY` | local `.env.local`; server code only | sampled Production home JS: value/name not found | NOT VERIFIED | Critical capability; Production placement NOT VERIFIED |
| `NEXT_PUBLIC_SITE_URL` | local value is `http://localhost`; Production value unavailable | public | n/a | Production canonical-host setting UNKNOWN |
| `NEXT_PUBLIC_FEATURE_SCHEMA_REGISTRY` | example file only | public flag | owner/Production value UNKNOWN | Medium |
| `NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2` | example file only | public flag | owner/Production value UNKNOWN | Medium |
| `FEATURE_SERVER_API_V2` | example file only | server-only by naming | owner/Production value UNKNOWN | Medium |
| `FEATURE_REGISTRY_ADAPTER` | server code/example | no marker found in sampled public JS | owner/Production value UNKNOWN | High |
| `DPP_REGISTRY_ENVIRONMENT` | example defaults to `test` | server-only expected | NOT VERIFIED | High |
| `DPP_REGISTRY_BASE_URL` | example only | server-only expected | NOT VERIFIED | High |
| `DPP_REGISTRY_CLIENT_ID` | example only | server-only expected | NOT VERIFIED | High |
| `DPP_REGISTRY_CLIENT_SECRET` | example only | server-only expected | NOT VERIFIED | Critical if present/mis-scoped |
| BMS integration API keys | generated runtime credentials; hashes expected in DB | plaintext returned once by server | rotation exists in code; Production use UNKNOWN | Critical |
| Signing/webhook/third-party keys | no complete repository inventory | UNKNOWN | NOT VERIFIED | High |

The sampled public bundle check covered the root page's 11 JavaScript chunks. It found neither the locally configured service-role value nor the `SUPABASE_SERVICE_ROLE_KEY` name. This is useful negative evidence for that sample, not a proof covering every Production chunk, source map, log, or a different Production secret value.

## Registry production state

Repository evidence is explicit:

- Registry adapter actions are guarded by `FEATURE_REGISTRY_ADAPTER`.
- mappings/submissions are restricted to environment `TEST`;
- the adapter can record manual TEST outcomes;
- no automatic Production Registry OAuth/callback/polling/worker implementation was found.

| Question | Result |
|---|---|
| Production feature-flag value | NOT VERIFIED |
| Production Registry secret exists | NOT VERIFIED |
| Automated Production connector | repository says no; deployment commit still NOT VERIFIED |
| Callback/polling worker | not found in repository; Production monitoring NOT VERIFIED |
| Real Registry request triggered | NO |

No Registry endpoint was called during this audit.

## BMS production state

The repository provides hashed credentials, device/item binding, scoped credentials, five-minute replay window, idempotency keys, per-minute limits, rotation, and append-only ingestion records. Runtime table existence is partially observable, but actual Production credential and ingestion counts are not visible anonymously.

| Question | Result |
|---|---|
| Production ingestion enabled/used | NOT VERIFIED |
| Plaintext key stored | repository design says no; Production rows NOT VERIFIED |
| Rotation configured and exercised | code exists; operational evidence NOT VERIFIED |
| Rate limit enforced | code/schema expected; runtime evidence NOT VERIFIED |
| Replay and idempotency | code/schema expected; runtime evidence NOT VERIFIED |
| Tenant/item binding | item/device binding expected; full Tenant boundary NOT VERIFIED |

No telemetry or credential request was sent.

## Feature flag baseline

| Flag/control | Repository default | Production value | Enforcement | Owner | Purpose/risk |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_FEATURE_SCHEMA_REGISTRY` | false in example | NOT VERIFIED | declaration exists; no active importer found | UNKNOWN | UI flag must not control data security |
| `NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2` | false in example | NOT VERIFIED | declaration exists; no active importer found | UNKNOWN | documentation and runtime use may have drifted |
| `FEATURE_SERVER_API_V2` | false in example | NOT VERIFIED | no active runtime check found | UNKNOWN | declared flag is not a proven backend gate |
| `FEATURE_REGISTRY_ADAPTER` | false in example | NOT VERIFIED | server enforced in Registry repository | UNKNOWN | TEST adapter is disabled unless explicitly enabled |
| canonical public read | no explicit flag | canonical-first in repository | backend read ordering | UNKNOWN | deployed commit/source selection NOT VERIFIED |
| legacy live fallback | no explicit flag | enabled by repository path | backend fallback | UNKNOWN | P0: cannot be disabled/observed per Passport today |

Feature flags are operational controls, not authorization. The declared but unused flags should not be assumed to protect Production behavior.

## Required follow-up

- read-only Vercel environment inventory showing name, target, scope, and last changed time;
- secret-manager ownership and rotation records;
- proof that service-role and Registry/BMS secrets are absent from every client bundle/source map;
- least-privilege review of external credentials;
- BMS credential/ingestion aggregate counts without values;
- emergency revoke/rotation runbooks, exercised outside Production.

**Secrets status: PARTIAL NEGATIVE EVIDENCE; Production safety NOT VERIFIED.**
