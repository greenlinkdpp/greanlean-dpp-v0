# Phase 5 RLS and Security

RLS is enabled on every tenant-owned Phase 5 table. Policies reuse the Phase 1 tenant capability and Partner authorization/resource-scope model. Platform identity alone does not grant tenant access, and a caller cannot forge tenant context.

Cross-tenant references are blocked with composite foreign keys for connector/job/receipt/import/BMS/Registry relationships. Product targets also carry tenant consistency. Append-only evidence tables reject update/delete, published DPP guards remain owned by Phase 4, and service-only internals are not exposed as authenticated write surfaces.

Credential metadata receives special handling: authenticated callers can see only safe status fields through an invoker-security projection when authorized. Secret references and resolved secret values never appear in connector or receipt responses.

Rate counters are service-only mutable internals. Their composite uniqueness key contains Tenant, Connector Instance, credential scope, route and minute window; the security-definer consumer validates the tenant/connector/credential relationship before incrementing. Authenticated users receive only aggregate observability.

Contract and live tests passed tenant isolation, cross-tenant rejection, read-only actor rejection, Partner resource scope, credential redaction, Production connector rejection, forged context denial and audit persistence.
