# Phase 3 V1, Phase 1 and Phase 2 Regression

Regression policy: Phase 3 is additive and must preserve all earlier behavior before and after rollback.

Verified evidence:

- full unit/integration suite includes legacy V1, battery, publication, Phase 1, Phase 2 and Phase 3 contracts;
- all numbered migration contract tests pass, including 0027, 0028 and 0029;
- after live 0029 rollback, `product_model` remained available and the full Phase 2 live verifier passed all hierarchy, constraint, identifier, RLS, partner, Read Only, forged-context, PDP audit, idempotency and legacy-mapping checks;
- the final 0029 reapply passed; the final suite reported 174 unit/integration and 40 migration tests passed, followed by a successful optimized build.

No V1 table is repurposed as the Phase 3 canonical store. Legacy sources converge through read-only adapters and explicit `LEGACY_SOURCE_UNKNOWN` Provenance where necessary.
