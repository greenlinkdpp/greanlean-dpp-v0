# Resolver Remediation Plan

| Finding | Evidence | Root cause | Change | Expected impact | Security/correctness impact | Rollback |
|---|---|---|---|---|---|---|
| 6–7 sequential database HTTP calls | Server-Timing plus source query count | Network/multi-round-trip | One `SECURITY DEFINER`, service-role-only fast-path RPC | Remove 5–6 network waits | Retains host allowlist, tenant joins, alias bound/cycle guard, current pointer and immutable published version checks | Apply `0035` rollback and restore repository call path |
| Active normalized identifier lookup lacks a leading normalized-value index | EXPLAIN filters active identifiers | Future identifier cardinality | Partial active normalized-value index | Stable lookup toward 5,000 Passport Pilot limit | Read-only index; no semantic change | Drop index via rollback |
| Projection is <=0.1 ms | Server-Timing | Not a bottleneck | No projection cache | Avoid stale-current-pointer/withdrawal risk | Direct current-pointer semantics preserved | None |
| Distributed limiter costs hundreds of ms at p95 but is required | Hosted timing | Network round trip | Retain distributed atomic limiter; add timing visibility only | Preserve security while measuring residual | 429, Retry-After and spoof-resistant identity unchanged | Remove timing header instrumentation only |

No RLS policy was disabled. The fast path runs only under the same server-side service-role trust boundary already used by the public repository, and its execution privilege is revoked from `public`, `anon`, and `authenticated`.
