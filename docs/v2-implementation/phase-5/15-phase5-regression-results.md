# Phase 5 Regression Results

Final regression date: 2026-09-26.

| Baseline | Evidence | Result |
|---|---|---|
| V1 | 192-test full suite, optimized build, 10 representative Development REST tables HTTP 200 | PASS |
| Phase 1 | live verifier: tenant isolation, PDP, Partner scope, audit, idempotency, private Storage cleanup | PASS |
| Phase 2 | live verifier: hierarchy, identifiers, constraints, RLS, Partner scope, legacy mapping | PASS |
| Phase 3 | migration `0029`, Dry Run/commit, immutable versions, resolution, 100% provenance, RLS | PASS |
| Phase 4 | migration `0030`, two immutable versions, five formats, seven Resolver inputs | PASS |
| Phase 5 | migration `0031`, complete synthetic connector workflow | PASS |

The Phase 1 verifier was initially launched concurrently with Phase 2 and received one transient Auth 400. It was rerun serially and completed with every check PASS; the final result is based on the complete serial run.

An additional content smoke was attempted. The homepage passed, but the first showcase returned 404 because the isolated Development database does not contain that legacy reference product. Installing the repository's optional legacy seed exposed the known P0 trigger compatibility issue recorded in `16-phase5-open-issues.md`; its transaction rolled back. This optional fixture absence is not used as evidence for V1 PASS. The V1 regression evidence is the full suite/build plus successful reads of `products`, `dpp_publication`, `dpp_file_asset`, `dpp_lifecycle_event`, `dpp_organisation`, `dpp_project`, `battery_item`, `battery_operating_metric`, `schema_version` and `field_definition`.

Migration evidence:

`0031 UP → Phase 5 live PASS → 0031 ROLLBACK → Phase 4 live PASS → 0031 UP → Phase 5 live PASS`.
