# Hosted Proxy Security

Hosted PreProd trusts Vercel's platform-owned `x-vercel-forwarded-for` only when `VERCEL=1`; otherwise it uses `x-real-ip`. Caller-supplied generic `x-forwarded-for` is not used as rate-limit identity. The selected client value is SHA-256 hashed before it reaches the distributed limiter.

Hosted spoof probes using different caller-supplied forwarding headers produced the same diagnostic PreProd identity prefix and remained on the distributed backend. The full address and hash are not exposed in this document. Production does not emit the diagnostic identity header.

Verified controls:

- HTTP redirects to HTTPS (308 observed).
- HSTS, CSP with `strict-dynamic`, `nosniff`, frame denial, referrer policy, and permissions policy are present.
- Forwarded-IP spoofing did not change admission identity.
- Canonical host behaviour is enforced; the deployment hostname redirects to the stable alias.
- Limiter backend failure is fail-closed.

Real-world IP propagation remains dependent on Vercel's trusted ingress contract; direct origin exposure is not part of the deployment topology.
