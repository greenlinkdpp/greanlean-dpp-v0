# Test Layout

| Directory | Scope |
|---|---|
| `unit` | Pure Schema Registry and rule behavior |
| `integration` | Stable DPP JSON contract checks |
| `migrations` | Migration/rollback pairing and safety structure |
| `visual` | Public-page screenshot baseline manifest |

`npm test` runs unit and integration tests. `npm run test:migrations` is kept
separate so database work cannot be mistaken for ordinary source tests. The
migration suite in Phase 3 is structural; a PostgreSQL up/down rehearsal is
still required before applying SQL to any shared environment.
