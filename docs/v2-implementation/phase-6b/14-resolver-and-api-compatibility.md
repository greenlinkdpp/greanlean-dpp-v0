# Resolver and API Compatibility

Verified against the local PreProd release candidate:

- JSON, HTML, JSON-LD, PDF, and QR formats resolve the same immutable V2 version.
- ETag conditional request returns 304.
- GTIN/alias resolver inputs pass.
- Existing V1 `/p` and `/api/qr` behavior remains available.
- Legacy `/01/{gtin}` now falls through to the V2 resolver only when no V1 identity exists and all V2 public feature flags are enabled.
- API V1/V2 inventory is captured in evidence.

Classification: `PASS_WITH_QUARANTINE`, because five legacy rows still need business mapping decisions.

Evidence: `evidence/preproduction-shadow-compatibility.json`.
