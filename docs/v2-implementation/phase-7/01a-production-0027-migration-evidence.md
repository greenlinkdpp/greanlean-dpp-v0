# Production Migration 0027 Evidence

```text
PRE_0027_PRODUCTION_BASELINE = PASS
MIGRATION_0027_PREFLIGHT = PASS
PRODUCTION_MIGRATION_0027 = PASS
PRODUCTION_MIGRATION_HEAD = 0027
V1_AFTER_0027 = PASS
CANONICAL_TENANT_MODEL_AVAILABLE = TRUE
```

## Change identity

| Field | Value |
|---|---|
| Production project | `greanlen-dpp` / `lpxdbysgmdsjhxrjzhly` |
| Project state | `ACTIVE_HEALTHY` |
| Region | `ap-southeast-1` |
| Head before | `0026` |
| Head after | `0027` |
| Migration checksum | `15a2984852d2c94517876102f673f563fdb19060df37cf569753235e6504ecc0` |
| RC commit | `907f86f1c57cc5957af974048e4539cf54877284` |
| Execution start | `2026-09-27T23:57:11.628Z` |
| Execution finish | `2026-09-27T23:57:14.793Z` |
| Latest completed backup | physical backup `1801742967`, `2026-09-27T16:53:31.313Z` |
| Restore evidence | Phase 6B isolated restore PASS, measured 4m14s |

The repository file, RC blob and executed SQL were byte-identical. Preflight found no DROP, destructive ALTER, V1 UPDATE/DELETE, product/passport migration, Tenant reassignment or Phase 2–5 schema. Expected foundation seeds created capabilities, permission profiles and global Partner/Integration roles.

## Schema result

- 15/15 Phase 1 foundation tables created.
- 15/15 Phase 1 tables have RLS enabled.
- 23 Phase 1 policies created.
- Tenant, Organisation, Partner and tenant-scoped IAM remain separate models.
- `v2_seed_tenant_roles()` and `v2_user_has_capability(uuid,text)` exist.
- No legacy Organisation was converted: immediately after migration, Tenant and `organisation_v2` counts were both zero while V1 organisations remained three.
- The source migration records ledger environment as `development`; this exact RC metadata value is disclosed and left unchanged.

## V1 baseline and regression

| Resource | Before | After 0027 | Fingerprint/result |
|---|---:|---:|---|
| V1 organisations | 3 | 3 | `7dd9d1f1875f5bc858b282faa9ea4658820f553bc5e4d89a6241ecf986cf2519` |
| V1 projects | 0 | 0 | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` |
| Products | 9 | 9 | `42caab3ea87733874ecd81f889b8435e22bdb2d13edad2ba12970bdb91a1d9c7` |
| Product versions | 12 | 12 | `d747b46796cd71da0244f5d3d01df3015310f07df41c2e0e4adcea941f40acf5` |
| Identifier aliases | 6 | 6 | `ed1ad57cd54a45acb23778264d5e083288ff249c4e0140bab1922287f829a7aa` |
| Storage buckets | 3 | 3 | `26ee37485719b624adea752d35a362cf7b713963fb50f710b1eaf8fe2f441602` |

| Public surface | Before | After 0027 | Expected |
|---|---:|---:|---:|
| Homepage | 200 | 200 | 200 |
| Existing public DPP | 200 | 200 | 200 |
| Existing public API | 200 | 200 | 200 |
| Legacy `/01/06900000014336` baseline | 404 | 404 | 404 |
| Login/Auth surface | 200 | 200 | 200 |

REST, Auth and Storage health were all 200. No application deployment, QR change, traffic switch or feature flag change occurred.
