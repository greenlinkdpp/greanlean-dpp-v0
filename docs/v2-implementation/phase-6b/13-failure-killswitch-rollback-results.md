# Failure Injection, Kill Switch, and Rollback Results

- Backend-unavailable resolver injection returned controlled 500 `RESOLVER_LOOKUP_FAILED`; V1 QR stayed available.
- A deliberately failed transactional DDL migration left no partial table.
- Four independent V2 feature switches returned 404 `V2_FEATURE_DISABLED`; V1 QR stayed available.
- PreProd migrations `0032`→`0027` were rolled back, absence verified, and reapplied to `0032`.
- Migration `0033` was applied, future-tenant capability seeding verified, rolled back with tracked cleanup, and reapplied.

Result: PASS for the rehearsed isolated-PreProd scenarios.

Evidence: `evidence/preproduction-failure-injection.json`, `evidence/preproduction-kill-switch-rehearsal.json`, `evidence/preproduction-rollback-rehearsal.json`, and `evidence/preproduction-0033-capability-repair.json`.
