# Resolver Remediation Result

PreProd migration `0035_phase6c_resolver_fast_path` is applied only to project `efhiaufukjchxqhbmpvq`. It adds:

- `product_identifier_normalized_active_idx` for active normalized identifiers.
- `v2_phase6c_resolve_public_passport(text,text,text[])`.
- Service-role-only execution; anonymous and authenticated roles have no execute privilege.
- Bounded recursive alias traversal, cycle detection, valid-window checks, host allowlisting, unambiguous Passport enforcement, current-pointer validation and withdrawn tombstones.

The application now performs one Resolver database RPC. `Server-Timing` exposes rate-limit admission, Resolver DB fast path, projection and route totals, and the response exposes query count without sensitive data.

## Result

| Metric | Before | After |
|---|---:|---:|
| Normal database round trips | 6–7 | 1 |
| Duplicate query count | possible overlapping mapping lookup | 0 |
| Warm DB fast-path median | sum of multiple 250–850 ms calls | about 260–292 ms |
| Projection | 0–0.1 ms | 0–0.1 ms |

No application/CDN response cache was introduced. This avoids cross-tenant, withdrawn-state and stale-current-pointer failure modes while still meeting the Pilot SLO.

Hosted PreProd deployment: `dpl_CdUfeNLMp3J4UfSPXRupCdfgkiAa` at the stable `https://greanlean-dpp-preprod.vercel.app` alias.
