# Connector Job and Retry Model

Jobs are tenant-owned commands with a stable idempotency key, pinned connector/adapter version, request fingerprint and operation snapshot. Reusing the same key and payload returns the original operation; reuse with a different payload is rejected.

State model:

`QUEUED → RUNNING → SUCCEEDED | FAILED | RETRY_WAIT | DEAD_LETTER`

`QUEUED` and `RETRY_WAIT` can become `CANCELLED`. A request already sent externally is recorded distinctly and is never reported as a successful remote withdrawal.

Retry behavior is bounded by the instance retry profile. Timeouts, HTTP 429 and transient 5xx failures are retryable; configuration errors, authentication failures and ordinary 4xx rejection are terminal. Exponential delay is capped, attempts are immutable, and exhausting the configured maximum creates dead-letter evidence.

Circuit states are `CLOSED`, `OPEN` and `HALF_OPEN`. Failure thresholds open the circuit; a reset interval permits a bounded probe; success closes it. Incremental adapters persist cursor/watermark state only through the connector boundary.

The database rate-limit RPC atomically consumes a fixed-window token scoped by Tenant, Connector Instance, credential reference (or the explicit `NONE` scope) and route. Counters are service-only and API operations return `CONNECTOR_RATE_LIMITED` with limit/retry metadata after the configured per-minute ceiling.

Verified tests cover enforced 429 rate limiting, external 429/500/timeout classification, 400/401 terminal behavior, bounded attempts, dead-letter decisions, cancellation and circuit transitions.
