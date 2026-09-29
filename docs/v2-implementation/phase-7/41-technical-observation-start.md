# Phase 7 Technical Observation Start

Generated: `2026-09-29`

```text
TECHNICAL_GO_LIVE = TRUE
TECHNICAL_GO_LIVE_AT = 2026-09-29T09:58:07.210Z
FORMAL_OBSERVATION_WINDOW_STARTED = YES
OBSERVATION_START_AT = 2026-09-29T09:58:07.210Z
OBSERVATION_END_NOT_BEFORE = 2026-10-06T09:58:07.210Z
PHASE_7_COMPLETE = FALSE
PHASE_8_ENTERED = FALSE
```

The formal seven-day observation covers all 22 public DPP pages, Resolver, QR, payload/version/current-pointer consistency, V1 continuity and latency, V2 latency, HTTP 5xx, unexpected 4xx, Auth, Storage, Backoffice, Tenant isolation, audience leakage and the warning contract.

During the window:

- keep Registry submission, real customer connectors, connector execution, file import and BMS adapter off;
- keep Global, SOODOO and all other Tenants non-primary;
- preserve `NEXT_PUBLIC_SITE_URL=https://www.greanlean.com` and the exact accepted RC source;
- treat any code or migration change as invalidating this observed release state;
- keep V1 DPP latency open for Pilot monitoring.

This document starts observation only. It does not close Phase 7 and does not authorize Phase 8.

