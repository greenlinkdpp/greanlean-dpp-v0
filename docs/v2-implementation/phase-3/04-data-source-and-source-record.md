# Data Source and Source Record

`data_source` identifies the Tenant-owned origin, type, provider, trust level, status, residency classification and connector reference. Supported source types include Manual, Excel, CSV, JSON, API, ERP, MES, PLM, BMS, Supplier and Legacy.

`source_record` stores an immutable ingestion input reference: source, optional product hint, payload hash, observation/receipt timestamps, classification and status. Payload mode is either `RAW_STORED` or `REFERENCE_ONLY`; the latter requires an external reference. Raw payloads are never public.

The Development verifier uses a synthetic JSON/Excel-like record and a SHA-256 payload hash. Large or sensitive customer files remain outside Phase 3 and are referenced rather than copied.
