# Phase 4 open issues

No issue blocks Phase 4 acceptance. Deferred items are:

1. Resolver host allowlist values must be supplied per deployed environment; Phase 4 seeds only Development hosts.
2. JSON-LD remains a controlled partial internal profile until an authoritative external context is selected.
3. The lightweight PDF renderer is intentionally simple; typography and localization can improve without changing its immutable source contract.
4. Alias administration currently exposes create only; update/retire remains a controlled database operation and should receive dedicated API routes when operational ownership is defined.
5. Metrics are structured application logs rather than a production observability backend.
6. V1 compatibility cutover remains Development-only. Production cutover requires separate acceptance and migration instructions.

Registry connectors, external ERP/MES/PLM integrations, credentials, callbacks and production QR replacement are outside Phase 4.

