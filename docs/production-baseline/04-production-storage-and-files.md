# 04 Production Storage and Files

## Runtime observation

An anonymous read-only request to the configured Supabase Storage bucket-list endpoint returned HTTP 200 with zero visible buckets. This is compatible with a private bucket, but it does not prove that the bucket exists or that its policies are correct.

**Production bucket inventory: NOT VERIFIED.**

## Repository-expected implementation

| Property | Repository expectation | Production proof |
|---|---|---|
| Bucket | `dpp-evidence` | NOT VERIFIED |
| Public/private | private (`public=false`) | NOT VERIFIED |
| Upload size | application path 25 MiB; migration bucket limit 100 MiB | NOT VERIFIED; limits differ by layer intentionally/otherwise |
| Object key | `{productId}/{assetId}/v{n}/{uuid}/{filename}` | code verified; Production objects NOT VERIFIED |
| Upsert | disabled | code verified |
| File versioning | append-only `dpp_file_version` | table exists; trigger NOT VERIFIED |
| Content hash | SHA-256 | code/schema expected; Production rows NOT VERIFIED |
| Signed URL | 60 seconds | code verified; Production configuration NOT VERIFIED |
| Authorization | product access level checked before signing | code verified; Production execution NOT TESTED |
| Download audit | writes `dpp_access_audit` | code verified; not invoked because task is read-only |
| MIME allowlist | PDF, JSON, JPEG, PNG, CSV, text, XLSX in migration | Production bucket config NOT VERIFIED |
| Versioning/retention/delete protection | not established in repository | NOT VERIFIED |
| Backup/restore | no Production evidence | NOT VERIFIED |

## Cross-tenant access chain

Repository code implements:

```text
version ID
→ file version and asset lookup
→ product access-level decision
→ access audit write
→ 60-second signed URL
```

Positive points:

- the object path alone is not passed directly to a signer;
- the file version is looked up before authorization;
- signed URLs are short lived;
- downloads are designed to be audited;
- file versions and evidence links are designed as immutable/append-only.

Unverified risks:

- no Production proof that storage object policies bind to the same product/tenant;
- legacy products do not have a universal tenant foreign key;
- server service-role usage bypasses storage RLS by design and depends on application authorization;
- actual object count, orphan count, hashes, tenant paths, retention, and deleted-object recovery are unknown;
- current object paths start with product ID, not a required V2 tenant ID.

## Data scale

Anonymous database counts showed zero public-visible `dpp_file_asset` and `dpp_lifecycle_event` rows. This is not a total count and must not be used for capacity planning.

## Required read-only follow-up

1. Export bucket configuration and storage policies.
2. Count objects and metadata by bucket without downloading contents.
3. Compare object keys to immutable file-version rows and list only aggregate orphan counts.
4. Document bucket backup, version retention, deletion recovery, RPO, and RTO.
5. Execute cross-tenant file negative tests in staging.
6. Prove that signed URL issuance and denial are both audited without exposing the signed URLs in reports.

**Storage recovery status: NOT VERIFIED.**
