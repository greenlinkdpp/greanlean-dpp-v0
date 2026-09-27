# Production schema, RLS, and Storage verification

## Schema and migration comparison

| Control | Result | Evidence |
|---|---|---|
| Migration ledger readable | PASS | One entry; highest `0026` |
| Repository V2 tables deployed | MISSING | 0/51 expected V2 tables in OpenAPI |
| Columns, PK/FK, indexes, triggers | PARTIAL | OpenAPI verifies exposure only; no trusted catalog dump |
| Functions, grants, SECURITY DEFINER, search path | PARTIAL | RPC inventory available; definitions/grants not exhaustively verified |
| Production drift | FAIL | Repository expects `0027`–`0032`; Production ledger stops at `0026` |

No migration was applied to Production.

## RLS

Repository migrations and 50 migration contract tests verify intended RLS, grants, append-only guards, tenant keys, and rollback artifacts. That static evidence does not prove the deployed Production catalog. Because all new V2 tables are absent and no safe multi-identity negative test was run against Production:

```text
RLS_RUNTIME_VERIFICATION = PARTIAL
```

Production RLS cannot be marked PASS.

## Storage

The read-only Storage API reports three buckets: one public and two private. Bucket names are retained only as hashes. The public bucket and one private bucket have no file-size limit or MIME allowlist; the second private bucket has a size limit and seven allowed MIME types. Storage object policies, signed-URL expiry behavior, retention, malware scanning, and backup coverage were not proven.

## Result

Schema drift is confirmed and Production policy evidence is incomplete. No automated repair is authorized. `GATE-A = FAIL`.
