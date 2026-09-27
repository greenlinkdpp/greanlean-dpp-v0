# Phase 3 RLS and Security

RLS is enabled on Data Source, Source Record, Mapping Profile, Mapping Version, Mapping Rule, Transformation Result, Provenance Record and Canonical Claim. Policies reuse Phase 1 capabilities.

Tenant members see only their own Tenant data. Schema reads allow global definitions plus authorized Tenant extensions; writes are limited to the actor's Tenant extension. Partner Claim/Provenance reads require an exact resource scope, and internal Fields are excluded from Partner Claim visibility.

The server executes only after Authenticate → Tenant Context → Capability → PDP → Service → RLS → Audit. Client-supplied Tenant IDs are treated as requested scope, never authority.

Negative coverage includes cross-Tenant RLS, forged Tenant context, Read Only Mapping commit denial, active Mapping Rule immutability, global Schema write denial, published Schema/Field immutability, and safe non-enumerating errors.
