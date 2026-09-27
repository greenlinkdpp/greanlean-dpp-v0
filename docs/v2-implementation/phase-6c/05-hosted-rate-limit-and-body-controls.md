# Hosted Rate Limit and Body Controls

## Distributed limiter

PreProd migration `0034_phase6c_hosted_pilot_controls` creates `v2_public_rate_limit_counter` and atomic, `SECURITY DEFINER` RPC `v2_phase6c_consume_public_rate_limit`. Table access is revoked from `public`, `anon`, and `authenticated`; RPC execution is granted only to `service_role`. Hosted middleware selects it with `PUBLIC_RATE_LIMIT_BACKEND=supabase` and fails closed with 503 if admission cannot be evaluated.

Covered surfaces and one-minute ceilings:

| Surface | Ceiling |
|---|---:|
| Resolver | 120 |
| Public JSON DPP | 90 |
| Public HTML DPP | 120 |
| Identifier lookup | 120 |
| QR | 30 |

Hosted verification observed `X-RateLimit-Backend: distributed`; the QR sequence reached 429 at the atomic ceiling and included `Retry-After`.

## Request body controls

Middleware rejects declared `Content-Length` above the route cap. `withApiRoute` also reads the cloned request stream incrementally and aborts when accumulated bytes exceed the cap, independently of `Content-Length`.

Hosted results:

| Probe | Result |
|---|---|
| Declared JSON body 1,048,577 bytes | 413 |
| Chunked JSON body 1,048,577 bytes | 413 |
| Unknown-length small JSON body | Reached normal validation/authentication and returned 400 |

```text
HOSTED_RATE_LIMIT = PASS
CHUNKED_BODY_ENFORCEMENT = PASS
```
