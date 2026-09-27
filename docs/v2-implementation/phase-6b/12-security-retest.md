# Security Retest

## Passed

- Production dependency audit reports no known vulnerabilities.
- CSP nonce, `strict-dynamic`, HSTS, no-sniff, and frame-deny headers verified.
- Resolver/database failures fail closed with generic messages and correlation IDs.
- RLS verification passed in Phase 1–5 verification.
- Connector destination validation/SSRF controls passed.
- Webhook signature validation, replay prevention, and idempotency passed.
- Registry rejection and timeout paths passed.
- Public QR rate limit and declared body-size controls passed.
- Transactional partial-migration injection left no partial table.
- Four V2 kill switches independently failed closed while V1 QR remained available.
- Managed backup evidence and an isolated database restore drill passed.
- Lint, typecheck, 201 application tests, 52 migration tests, and production build passed.

## Blocking limitations

- Rate limiting is process-local rather than distributed.
- Hosted edge/proxy behavior has not been tested because there is no hosted PreProd frontend.
- Chunked/undeclared body limits require edge or streaming enforcement.
- External on-call routing and accountable ownership are not configured.

The recovery gap is closed, but the remaining Internet-facing operational controls are not accepted; therefore `SECURITY_GATE = BLOCKED`.

Evidence is stored in the `evidence/` directory, especially `production-managed-restore-drill.json`, `preproduction-http-controls.json`, `preproduction-failure-injection.json`, `preproduction-kill-switch-rehearsal.json`, and `preproduction-phase1-phase5-verification.json`.
