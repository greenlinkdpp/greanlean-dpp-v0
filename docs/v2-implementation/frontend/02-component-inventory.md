# Productized DPP Component Inventory

| Component / function | Purpose | Reusable behavior |
|---|---|---|
| `ProductizedDppPage` | Complete public Passport composition | Hero, navigation, sections, language and audience state |
| `normalizeDppProjection` | Resolver payload adapter | Identity, metrics, sections and presentation metadata |
| `presentationMetadataFor` | Field-code presentation lookup | Safe generic fallback for future fields |
| `ValueGrid` | Scalar and object rendering | Booleans, units, lists, nested key/value groups and business states |
| `StatusBadge` | Status and verification labels | Text accompanies color |
| `Gauge` | Percentage health metric | Accessible `meter` semantics |
| `BmsPanel` | Latest snapshot presentation | SOC, SOH and measurements; never claims live streaming |
| `CarbonPanel` | Carbon footprint summary | Total, functional unit and accessible lifecycle bars |
| `CompositionPanel` | Recycled/material composition | Percentage bars plus metadata |
| `DocumentsPanel` | Document cards | Metadata-only state; HTTPS open action only when a real URL exists |
| `TimelinePanel` | Ordered lifecycle events | Timestamp, actor and evidence reference |
| `FieldRenderer` | Render dispatch | Specialized render types plus structured fallback |
| Technical `details` | Secondary diagnostics | Collapsed UUIDs, hashes and unknown/internal fields |
| Signed audience preview | PreProd QA mechanism | Server-verified, time-bound role projection; no Production activation |

The page uses semantic `main`, `header`, `nav`, `section`, `article`, `dl`, `ol`, headings, alerts and meters. No large visualization dependency was introduced.
