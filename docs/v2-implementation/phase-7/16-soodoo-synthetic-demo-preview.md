# SOODOO Complete Synthetic Demo — Hosted PreProd Result

```text
SOODOO_COMPLETE_SYNTHETIC_DEMO = PASS

TENANT_COUNT = 1
ORGANISATION_COUNT = 1
FAMILY_COUNT = 1
MODEL_COUNT = 1
SKU_COUNT = 1
BATCH_COUNT = 1
INDIVIDUAL_COUNT = 3
PASSPORT_COUNT = 3

DPP_PUBLICATION = PASS
RESOLVER = PASS
QR = PASS
AUDIENCE_PROJECTION = PASS
BMS_DEMO = PASS
DOCUMENT_DEMO = PASS

V2_PREVIEW_READY = TRUE

CUSTOMER_VERIFIED = FALSE
REAL_CUSTOMER_DATA_STATUS = PENDING
REGISTRY_SUBMISSION_PERFORMED = NO
REAL_CUSTOMER_CONNECTORS_ACTIVATED = NO

PRODUCTION_WRITE_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
PHASE 8 ENTERED = NO
```

## Environment and source

The complete Demo exists only in Hosted PreProd `greanlean-dpp-preprod` (`efhiaufukjchxqhbmpvq`) at migration head `0035`. It uses the canonical Production SOODOO Tenant ID as an isolated PreProd mirror, without writing the Demo to Production.

The only business fact source is `evidence/SOODOO_Complete_Synthetic_Demo_Fixture.json`, SHA-256 `104988c95cdc3bdb70ff7568f9090233fb8ee44b03b4366a8b156323204eafde`. Every canonical claim is `UNVERIFIED`, has synthetic-fixture provenance and carries visible classification warnings.

## Created hierarchy

| Entity | Count | Identifier |
|---|---:|---|
| Tenant | 1 | `0c2f6dff-560d-4eeb-be47-1e87a2f710fe` |
| Organisation | 1 | `7cfb8a68-4128-4d85-bcdb-14bc2da73953` |
| Product Family | 1 | `ae2618cf-3446-40f4-8c33-3433f44628df` |
| Product Model | 1 | `edd1628a-3dab-4ae0-8a08-19afec9e5b0d` |
| SKU | 1 | `1629c48a-b06a-438e-87a9-767637e0c61b` |
| Batch | 1 | `0f9b5008-6657-4b46-8303-babf426fad6c` |
| Individual Items | 3 | fixture serial numbers |
| Passports / immutable versions | 3 / 3 | Version 1 each |
| Canonical identifiers | 10 | Model, synthetic GTIN, SKU, Batch, Serial and DPP IDs |
| BMS snapshots | 3 | one per Item |
| Document metadata | 5 | no fabricated laboratory signature |
| Lifecycle events | 3 | Synthetic Demo events |

SKU and Batch remain parallel dimensions and every Item is linked to both through the approved relationship model.

## Publication and preview

All three Passports completed Candidate → Validation → Review → Approval → Immutable Version → Current Pointer → Resolver. All validation summaries are PASS, all review tasks are PUBLISHED, and all Registry states are `NOT_SUBMITTED`.

- [Item 1 V2 preview](https://greanlean-dpp-preprod.vercel.app/p/DPP-SOODOO-SYN-BP4815-000001)
- [Item 2 V2 preview](https://greanlean-dpp-preprod.vercel.app/p/DPP-SOODOO-SYN-BP4815-000002)
- [Item 3 V2 preview](https://greanlean-dpp-preprod.vercel.app/p/DPP-SOODOO-SYN-BP4815-000003)

For each Passport, public JSON, public HTML, page rendering and official QR returned 200. QR targets use only the allowlisted PreProd Resolver host. The public preview visibly displays:

```text
SYNTHETIC DEMO DATA
NOT CUSTOMER VERIFIED
NOT FOR REGULATORY DECLARATION
```

## Audience and provenance

Each immutable payload contains 21 fields: 12 Public, 5 Legitimate Interest, 2 Authority-only and 2 Internal. Demo roles map Repairer and Recycler to the current Legitimate Interest projection, Manufacturer to Internal, and Authority to Authority. No anonymous endpoint exposes a non-Public projection.

The publication renderer was corrected so `UNVERIFIED` provenance is never described as verified. The change passed lint, typecheck, 110 unit tests and a production build, then was deployed only to the PreProd Vercel project as deployment `dpl_Et9v6Q2z2w82RrexRqivB1a25um4` from commit `f7734502670aeb49b55b48c288be56b11606b060`.

The fixture UPI value is a URN. Product Core deliberately requires HTTPS for a canonical UPI identifier, so it was retained verbatim as a visibly synthetic claim and was not rewritten or misclassified as a canonical UPI. The supplied synthetic GTIN passed checksum validation and is explicitly marked `SYNTHETIC_NOT_REGISTERED`.

## Safety boundary

The BMS fixture uses one `MOCK` connector instance in `DISABLED` state. Registry submission count is zero and no real connector was activated. A read-only Production verification confirmed head `0035` and zero SOODOO Models, Passports and identifiers in Production.

This result proves only that the complete Synthetic Demo is ready for V2 preview. It does not make the real SOODOO customer Pilot deterministic or complete, does not change the existing Phase 7 real-data blocker, and does not authorise Phase 8.

```text
NEXT ACTION =
USER PREVIEWS V2 COMPLETE DEMO
THEN UI / FIELD / WORKFLOW REVIEW
LATER REPLACE SYNTHETIC CLAIMS WITH REAL CUSTOMER DATA
```
