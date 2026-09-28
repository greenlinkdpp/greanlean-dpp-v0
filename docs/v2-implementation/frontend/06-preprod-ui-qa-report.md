# Hosted PreProd Productized UI QA Report

## Final status

```text
PRODUCTIZED_DPP_UI = PASS
PUBLIC_UI = PASS
MOBILE_UI = PASS
AUDIENCE_AWARE_UI = PASS
TECHNICAL_DETAILS_UI = PASS
BMS_UI = PASS
SUSTAINABILITY_UI = PASS
COMPLIANCE_UI = PASS
REPAIR_CIRCULARITY_UI = PASS
DOCUMENT_UI = PASS
LIFECYCLE_UI = PASS
PROVENANCE_UI = PASS

RAW_JSON_AS_PRIMARY_UI = FALSE
PUBLIC_DATA_LEAKAGE = NONE
UNVERIFIED_FALSE_VERIFIED_TEXT = NONE
ACCESSIBILITY_CRITICAL_ISSUES = 0
```

## Deployment

| Field | Result |
|---|---|
| Commit | `0909c9d51205604b7cdf896b7de3d4bc440f4680` |
| Git tree | `bee3bb947ba84668a4b079adcf171026329aa81c` |
| Deployment | `dpl_BPdJ6q9CwgypiqR14zgbZqSYbmQY` |
| Alias | `https://greanlean-dpp-preprod.vercel.app` |
| Migration head | `0035` |
| Deployment state | `READY` |

## Public previews

- [Item 1](https://greanlean-dpp-preprod.vercel.app/p/DPP-SOODOO-SYN-BP4815-000001?lang=en)
- [Item 2](https://greanlean-dpp-preprod.vercel.app/p/DPP-SOODOO-SYN-BP4815-000002?lang=en)
- [Item 3](https://greanlean-dpp-preprod.vercel.app/p/DPP-SOODOO-SYN-BP4815-000003?lang=en)

All three return 200, use the productized renderer, retain the three mandatory synthetic warnings and omit restricted BMS data. Signed QA verification confirmed distinct BMS values for the three Items: SOC `82/76/91`, SOH `100/99/100`, cycles `12/19/7`, charge state `DISCHARGING/IDLE/CHARGING`, and pack voltage `50.7/49.9/52.1 V`.

## Test and browser evidence

| Check | Result |
|---|---|
| Lint | PASS |
| Typecheck | PASS |
| Unit tests | 118/118 PASS |
| Integration tests | 95/95 PASS |
| Migration tests | 56/56 PASS |
| Production build | PASS, Next.js 15.5.26 |
| Static client bundle secret scan | PASS; 142 files, zero service-key matches |
| Changed-source debug marker scan | PASS |
| Hosted build | PASS, 56 seconds |
| Public page / JSON / HTML / QR | 200 for all three Items |
| Legacy alias | 200 and resolves to the current Passport presentation |
| Desktop visual QA | PASS |
| 375/390/430/768/1024/1440 px overflow | None |
| English / Simplified Chinese architecture | PASS; public toggle verified |
| Public role spoof attempt | Safely remains PUBLIC |
| False verified wording | None |

Browser visual inspection covered Item 1 desktop and 390 px mobile presentation, semantic structure, warnings, navigation, metrics, cards, charts, document metadata state and Technical Details. Hosted audience checks used one-hour server-signed grants and did not persist or publish the grants.

## Compatibility and limitations

Resolver JSON, HTML and QR outputs remain byte-contract compatible and use the current immutable payload. The current three active Demo Passports contain no withdrawn member; tombstone behavior therefore remains covered by the existing automated Phase 4 contract rather than a destructive live withdrawal exercise. Documents contain metadata only, so no fake Download action appears. No real-time BMS streaming, real customer verification or Registry submission is implied.

The historical Production RC remains invalid. No new Production RC was frozen and no Production application, traffic, Registry or connector state changed.
