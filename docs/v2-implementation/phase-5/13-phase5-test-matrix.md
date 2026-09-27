# Phase 5 Test Matrix

| Area | Automated evidence | Result |
|---|---|---|
| URL/SSRF/redirect/response bounds | `tests/unit/phase5ConnectorSecurity.test.ts` | PASS |
| HMAC/timestamp/redaction | `tests/unit/phase5ConnectorSecurity.test.ts` | PASS |
| Retry/dead letter/circuit/cancel | `tests/unit/phase5Connectors.test.ts` | PASS |
| CSV/JSON mapping/schema drift | `tests/unit/phase5Connectors.test.ts` | PASS |
| Registry and BMS pure contracts | `tests/unit/phase5Connectors.test.ts` | PASS |
| API capability/PDP/idempotency boundaries | `tests/integration/v2Phase5Contract.test.mjs` | PASS |
| Atomic per-scope rate limit and API 429 | migration contract + Development live verifier | PASS |
| Migration/RLS/guards/rollback contract | `tests/migrations/v2Phase5Integration.test.mjs` | PASS |
| Development full workflow | `scripts/verify-v2-phase5-development.mjs` | PASS |
| Full unit/integration regression | 192 tests | PASS |
| Full migration contract regression | 48 tests | PASS |
| TypeScript/repository hygiene | `tsc --noEmit`, `scripts/lint.mjs` | PASS |
| Next.js optimized build | 65 static pages plus dynamic V1/V2 routes | PASS |
| OpenAPI YAML parse | Ruby Psych parse | PASS |

Final live summary: migration `0031`; 10 connector instances exercised; ERP/MES/PLM imports PASS; Registry states `ACCEPTED/REJECTED/ACCEPTED`; BMS samples aggregated `2`; Webhook signature/replay/idempotency PASS; Resolver isolation PASS; Production write `false`.
