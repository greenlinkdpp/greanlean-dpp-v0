# Phase 4 security results

Verified outcomes:

- Tenant A cannot enumerate Tenant B Passport data.
- forged Tenant context is denied by the shared PDP.
- Read-only cannot submit Review.
- Author cannot approve.
- Reviewer cannot publish.
- Publisher has an explicit publish capability.
- anonymous INTERNAL projection is denied.
- public output contains no restricted fields or raw provenance.
- cross-Passport pointer insertion is rejected.
- published payload update and Version deletion are rejected by the database.
- unapproved and stale review publication are rejected.
- non-allowlisted QR/Resolver hosts are rejected.

The live fixtures are synthetic. No real customer Production data was read for these tests.

