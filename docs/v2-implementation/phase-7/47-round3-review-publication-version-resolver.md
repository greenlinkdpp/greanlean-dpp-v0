# Round 3 — Review, Publication, Version and Resolver Workspace

Date: 2026-09-29  
Baseline: Round 2 accepted RC `a5c00697eb5a4bf9bbf7f03b7fe2f0102348eff3` / tree `07ef978495703df6a94160952bfbabea34a105a7`  
Environment: isolated PreProd `greanlean-dpp-preprod`  
Result: **PASS**

## Implemented scope

- Candidate and Review surfaces now expose Tenant, product/subject, DPP ID, Schema Version, candidate hash, validation summary, frozen field values, access level, verification state, and provenance context. Candidate payloads are loaded only through the authorised Tenant-scoped Review detail API, not the aggregate snapshot.
- Existing Phase 4 Submit/Approve/Request Changes/Reject/Publish APIs remain the only mutation path. Capability, PDP, separation-of-duty, candidate-hash and stale-approval checks remain server enforced.
- Publication result feedback includes the published version/hash response, while the operator stays in the workspace for verification.
- Publication/Passport/Resolver workspace shows immutable version history, Current Pointer, schema, payload hash, published timestamp, supersedes relationship, approved canonical public URL, Resolver mapping status and QR. Historical versions have no edit controls. Withdraw uses the existing controlled withdraw API and preserves history.

No second publication engine, direct immutable-table insert, Registry operation, connector activation, or Production change was introduced.
