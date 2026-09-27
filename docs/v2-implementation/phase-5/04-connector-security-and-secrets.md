# Connector Security and Secrets

Phase 5 stores no plaintext secret. `connector_credential_reference` accepts only Development-safe references with `env://`, `test-vault://` or `dev-secret://` prefixes. API responses expose provider/status/fingerprint metadata but not the reference internals. The credential table has no authenticated direct-read policy; its status view uses invoker security.

Outbound controls:

- HTTPS only;
- exact host allowlist;
- DNS resolution followed by private, loopback, link-local and reserved-address rejection;
- every redirect target revalidated, with a maximum redirect count;
- request timeout, response-size and content-type bounds;
- database-atomic rate limits per tenant/connector/credential scope/route;
- response/error redaction before receipt persistence;
- Production connector environments rejected by API and database constraints.

Inbound controls:

- HMAC-SHA256 verification over timestamp and raw body;
- constant-time signature comparison;
- bounded timestamp window;
- stable external event ID and database uniqueness for replay/idempotency;
- JSON content type and 256 KiB body limit;
- connector/environment binding before accepting a webhook.

The Development live verifier used synthetic credentials only. No Production-like secret or Production customer data was introduced.
