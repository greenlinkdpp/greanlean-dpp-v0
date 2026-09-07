# BatteryPass Reference Configuration

## EU battery-passport regulatory catalog

`eu-battery-passport-datapoints-v2.0.json` is the platform's category-specific
regulatory working catalog. It preserves all 71 data points from *Digital
Batteries Passport - data point by category*, version 2.0 dated 15 August 2026,
including separate EV, LMT and industrial applicability statuses, bilingual
labels, legal sources, granularity, access, dynamic/static behavior, evidence
requirements and migration provenance.

The source document is implementation guidance and does not by itself replace
the Regulation, delegated acts, implementing acts or legal review. Future and
duplicate points remain configured but are excluded from ordinary entry screens
and completeness denominators.

Regenerate migration 0026 and the mapping CSV after changing the catalog:

```bash
node scripts/database/build_battery_regulatory_v2_bundle.mjs
```

## BatteryPass-Ready adapter

This directory contains the BatteryPass-Ready Longlist v1.3 normalization and
five JSON Schema configurations supplied for the project.

- The five schemas are validation configurations, not five statutory battery
  categories.
- Legal category and passport applicability are decided by Greanlean rules.
- Portable, SLI, and other batteries remain `TBD` for Longlist applicability
  unless an authoritative rule confirms a field.
- BatteryPass-Ready material is used under CC BY 4.0 and retains source hashes
  in the normalized catalog.

Regenerate the catalog:

```bash
python3 scripts/battery/normalize_longlist.py \
  "/path/to/2026_BatteryPass-Ready_DataAttributeLongList_v1.3.xlsx" \
  config/battery/schemas \
  config/battery/battery-pass-ready-longlist-v1.3.json
```
