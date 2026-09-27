# Framework and Security-Header Remediation

## Result

- Next.js: `15.5.26`
- React / React DOM: `19.2.8`
- Production dependency audit: no known vulnerabilities
- Production build: PASS

The response-control layer now emits a nonce-based CSP with `strict-dynamic`, HSTS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`. The verified CSP does not permit `unsafe-eval`.

Resolver error handling was tightened so allowlist/database failures fail closed as controlled server errors instead of being mislabeled as a public 404. Error responses expose a correlation ID but not backend details.

Evidence: `evidence/preproduction-http-controls.json`, `evidence/preproduction-failure-injection.json`.

These checks were performed against the local PreProd release candidate; hosted-edge header behavior remains to be rechecked after a PreProd deployment.
