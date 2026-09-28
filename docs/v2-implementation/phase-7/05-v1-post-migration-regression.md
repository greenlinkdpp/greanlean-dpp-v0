# V1 Post-Migration Regression

```text
V1_AFTER_V2_SCHEMA_MIGRATION = PASS
NON_PILOT_V1_CONTINUITY = PASS_AT_SCHEMA_GATE
PRODUCTION_DEPLOYMENT_CHANGED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
```

Read-only regression completed at `2026-09-28T00:15:20.476Z` after Production reached head `0035`.

| Resource | Before | After | Fingerprint/result |
|---|---:|---:|---|
| V1 organisations | 3 | 3 | `7dd9d1f1875f5bc858b282faa9ea4658820f553bc5e4d89a6241ecf986cf2519` |
| V1 projects | 0 | 0 | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` |
| Products | 9 | 9 | `42caab3ea87733874ecd81f889b8435e22bdb2d13edad2ba12970bdb91a1d9c7` |
| Product versions | 12 | 12 | `d747b46796cd71da0244f5d3d01df3015310f07df41c2e0e4adcea941f40acf5` |
| Identifier aliases | 6 | 6 | `ed1ad57cd54a45acb23778264d5e083288ff249c4e0140bab1922287f829a7aa` |
| Storage buckets | 3 | 3 | `26ee37485719b624adea752d35a362cf7b713963fb50f710b1eaf8fe2f441602` |

Homepage, an existing public DPP, the public API and login returned 200. The established legacy `/01/06900000014336` negative baseline remained 404. REST, Auth and Storage health returned 200. No existing V1 Tenant/customer/product row was reinterpreted or reassigned, and the canonical SOODOO Tenant remained unchanged.
