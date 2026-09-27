# Phase 3 Test Matrix

| Area | Evidence | Result |
|---|---|---|
| Schema reuse/extensions | migration + integration + live API | PASS |
| Published Schema immutability | migration triggers + live negative write | PASS |
| Mapping Dry Run, warnings, conversion | unit + live API | PASS |
| Mapping version immutability | migration + live negative write | PASS |
| Commit + persistent idempotency | live API | PASS |
| Claim five-state behavior | unit + database constraints | PASS |
| Claim supersession | unit + live API | PASS |
| Hierarchy and SKU/Batch conflict | unit + live candidate | PASS |
| Required UNKNOWN blocker | unit + live candidate | PASS |
| Candidate hash/publication separation | unit + integration | PASS |
| Provenance and conversion replay | migration + live database | PASS |
| Tenant/ReadOnly/forged-context security | live API/RLS | PASS |
| OpenAPI YAML | Ruby parser | PASS |
| UP → rollback → Phase 2 → UP | SQL Editor + live verifiers | PASS |

Automated commands are recorded in the exit report. Fixtures are synthetic and Development-only.
