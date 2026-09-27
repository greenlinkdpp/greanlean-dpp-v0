# Phase 4 RLS and security

RLS is enabled on every Tenant-owned Phase 4 table. Passport and Version reads require `dpp.view` or an exact Partner resource capability. Review write paths, Passport writes and Resolver Mapping writes require their explicit capabilities. Raw Version tables are never exposed to anonymous clients; public reads use the server projection boundary.

Publication and withdrawal RPCs are revoked from `public`, `anon`, and `authenticated`, and granted only to `service_role`. The server calls them only after PDP authorization. Audit rows are append-only.

Database constraints cover Tenant/subject ownership, Schema ownership, Passport identity immutability, Review Candidate immutability, Version immutability, current-pointer validity, resolver host/path uniqueness, path non-reassignment, cross-Tenant relations and alias cycles.

