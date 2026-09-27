# Phase 4 V1/V2/V3 regression

Regression evidence after the Phase 4 changes:

- V1 repository unit/integration suite: PASS.
- Phase 1 Development live verifier: PASS, including Tenant isolation, PDP, idempotency, audit and private storage.
- Phase 2 Development live verifier: PASS, including hierarchy, identifiers, RLS, Partner scope and legacy mapping contract.
- Phase 3 live verifier after Phase 4 rollback: PASS, including Mapping Dry Run/commit, immutable versions, resolution, provenance and RLS.
- Full local suite after final Phase 4 UP: 181 unit/integration and 44 migration tests PASS.
- TypeScript, repository hygiene and Next production build: PASS.

Shadow comparison policy classifies V1/V2 differences as `MATCH`, `KNOWN_DIFF`, or `UNKNOWN_DIFF`. The synthetic Phase 4 Passport is V2-primary, so live V1 fallback is deliberately absent; the expected structural differences are `KNOWN_DIFF`.

