# Shadow Compare Results

Classification: `PASS_WITH_QUARANTINE`.

The V2 resolver returned a consistent immutable version across JSON, HTML, JSON-LD, PDF, and QR projections. Conditional ETag behavior returned 304, aliases resolved, and both legacy `/p` and `/01` paths plus the V1 QR API remained compatible in the local PreProd release candidate.

The semantic V1→V2 shadow comparison cannot be promoted to full PASS because all five legacy rows require business review and none were automatically written to V2.

Evidence: `evidence/preproduction-shadow-compatibility.json` and `evidence/preproduction-seed-and-reconciliation.json`.
