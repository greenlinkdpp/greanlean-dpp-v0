# Shadow read and compare

## Required comparison contract

For the same synthetic Pre-Production requests, V1 remains the visible response while V2 produces a non-authoritative comparison for product identity, public DPP fields, identifier resolution, publication version, legacy URL resolution, access projection, PDF metadata, and JSON metadata. Differences must be classified `MATCH`, `KNOWN_DIFF`, or `UNKNOWN_DIFF`.

## Current evidence

Static and integration contracts demonstrate shared immutable publication identity across HTML, JSON-LD, PDF, and QR; public projection excludes telemetry; legacy URL handling remains present. However, there is no isolated Pre-Production deployment and no paired V1/V2 request corpus. Therefore:

| Metric | Result |
|---|---|
| Compared requests | 0 |
| MATCH | not measured |
| KNOWN_DIFF | not measured |
| UNKNOWN_DIFF | not measured |
| Critical UNKNOWN_DIFF | unknown |

No Production shadow write or read interception was enabled. `COMPATIBILITY_GATE = BLOCKED` until a Pre-Production corpus demonstrates zero critical unknown differences.
