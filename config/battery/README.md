# BatteryPass Reference Configuration

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
