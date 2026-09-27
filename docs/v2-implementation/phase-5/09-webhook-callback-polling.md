# Webhook, Callback and Polling

Webhook route: `POST /api/v2/webhooks/{connectorCode}`.

The route reads the raw body, enforces JSON and size limits, resolves an active non-Production connector binding, loads its Development secret reference, verifies HMAC/timestamp, and inserts the external event ID exactly once. Replayed IDs return the persisted event instead of repeating downstream work.

Callbacks retain connector, tenant, event ID, correlation material, verification outcome and redacted payload evidence. Unknown/invalid binding, missing credential, invalid signature, stale timestamp and oversized payload are rejected before domain processing.

Polling is explicit at `POST /api/v2/registry-submissions/{id}/poll`. Only pending states can be polled. It records an immutable attempt/receipt and advances the Registry state without modifying the published DPP or Resolver pointer.

The live verifier passed signature verification, replay protection, idempotency and Registry polling.
