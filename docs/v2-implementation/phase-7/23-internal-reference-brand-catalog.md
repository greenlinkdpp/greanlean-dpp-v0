# Phase 7 Internal Reference Brand Catalog

Status: **PASS**
Environment: **Hosted PreProd only**
Active demo Tenant: **GreanLean Reference Mobility**
Public brand: **GreanLean Reference**
Organisation: **GreanLean Reference Mobility Ltd. (Synthetic)**
Classification: **INTERNAL_SYNTHETIC_REFERENCE**

This is a GreanLean-owned, non-customer reference dataset. It is suitable for technical demonstrations and regression testing only. It is not customer verified, is not regulatory evidence, and must not be submitted to a Registry.

## Source interpretation

- Source label: `EN-50604(3).xlsx`
- Deterministic fixture SHA-256: `018c60c9db81d621aa439d5f801d5aad2756d29be4762bb85d106b2735425222`
- The workbook is treated only as a catalog/specification source.
- The filename is not evidence of EN 50604-1, CE, UN 38.3, IEC 62133-2, or any declaration of conformity.
- Chemistry is published as generic Lithium-ion; the specific chemistry remains `UNKNOWN`.
- No real GTIN or Registry identifier is asserted.

## Catalog topology

| Object | Count |
| --- | ---: |
| Product Family | 1 |
| Models | 8 |
| SKUs | 22 |
| Model-owned Batches | 8 |
| Batch–SKU links | 22 |
| Individual items | 22 |
| DPP Passports | 22 |

Batch and SKU remain parallel Model-owned dimensions. Each Model has one synthetic Batch linked to all its SKUs; each SKU has one synthetic Individual item.

## Model/SKU matrix

| Public model | Internal source code | Voltage | Configuration | SKUs | Model-owned batch |
| --- | --- | ---: | --- | --- | --- |
| GLR-P25A | `TL-EB-P25.2A` (internal only) | 25.2 V | 7S6P | GLR-P25A-13P2AH, GLR-P25A-15P6AH, GLR-P25A-17P4AH | `DEMO-2026-GLR-P25A` |
| GLR-P25B | `TL-EB-P25.2B` (internal only) | 25.2 V | 7S8P | GLR-P25B-20P8AH, GLR-P25B-23P2AH, GLR-P25B-27P2AH | `DEMO-2026-GLR-P25B` |
| GLR-E36A | `TL-BOS-E36A` (internal only) | 36 V | 10S4P | GLR-E36A-10P4AH, GLR-E36A-11P6AH | `DEMO-2026-GLR-E36A` |
| GLR-E36B | `TL-BOS-E36B` (internal only) | 36 V | 10S4P | GLR-E36B-10P4AH, GLR-E36B-11P6AH | `DEMO-2026-GLR-E36B` |
| GLR-P36A | `TL-EB-P36A` (internal only) | 36 V | 10S5P | GLR-P36A-13P0AH, GLR-P36A-14P5AH, GLR-P36A-17P0AH | `DEMO-2026-GLR-P36A` |
| GLR-Y36A | `TL-EB-Y36A` (internal only) | 36 V | 10S5P | GLR-Y36A-13P0AH, GLR-Y36A-14P5AH, GLR-Y36A-17P0AH | `DEMO-2026-GLR-Y36A` |
| GLR-S24B | `TL-EB-S24B` (internal only) | 24 V | 7S4P | GLR-S24B-10P4AH, GLR-S24B-11P6AH, GLR-S24B-13P6AH | `DEMO-2026-GLR-S24B` |
| GLR-S36B | `TL-EB-S36B` (internal only) | 36 V | 10S4P | GLR-S36B-10P4AH, GLR-S36B-11P6AH, GLR-S36B-13P6AH | `DEMO-2026-GLR-S36B` |

## Provenance classes

The three classes are kept separate:

- `SOURCE_SPREADSHEET`: 154 direct source facts (7 per SKU record).
- `DERIVED_ARITHMETIC`: 46 reproducible facts (series, parallel and cell count per Model, plus rated energy per SKU).
- `SYNTHETIC_DEMO`: 286 deliberately synthetic field groups (13 groups per Individual), plus synthetic IDs and lifecycle timestamps.

Every synthetic compliance and sustainability object carries `verified=false`, `customer_confirmed=false`, and/or `regulatory_evidence=false` as applicable. Sustainability values use a deterministic demo formula and explicitly state that they are not an LCA claim.

## SOODOO disposition

SOODOO was not deleted. Its PreProd Tenant metadata now records `defaultDemo=false`, `demoStatus=DEPRECATED_FOR_DEFAULT_DEMO`, and `retainedForRegression=true`. It is no longer the active/default synthetic demonstration dataset.

`TECHNICAL_REFERENCE_PILOT = INTERNAL_SYNTHETIC`
`REAL_CUSTOMER_PILOT = NOT_STARTED`
