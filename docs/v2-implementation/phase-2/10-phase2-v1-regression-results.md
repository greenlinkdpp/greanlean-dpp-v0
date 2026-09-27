# 10 Phase 2 V1 and Phase 1 Regression Results

## Pre-round-trip baseline

- Repository hygiene: PASS
- TypeScript: PASS
- Migration contracts: 36/36 PASS
- Unit/integration: 161/161 PASS
- Next.js production build: PASS
- Existing Phase 1 live verifier: previously PASS with migration `0027` in final UP state

## Final round-trip regression

    0028 UP
    → Phase 2 live tests
    → 0028 ROLLBACK
    → Phase 2 tables 404 and ledger row absent
    → Phase 1 tables available
    → Phase 1 live verifier PASS
    → 36/36 migration contracts PASS
    → 161/161 unit/integration PASS
    → 0028 UP
    → 7/7 Product Core tables available and one ledger row
    → Phase 2 live verifier PASS
    → Phase 1 live verifier PASS
    → full local tests and production build PASS

V1 REGRESSION = PASS  
PHASE 1 REGRESSION = PASS
