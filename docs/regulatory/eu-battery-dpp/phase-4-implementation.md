# Phase 4 Battery DPP Implementation

## Classification

The product flow separates legal categories from validation configurations.
Legal categories are EV, LMT, industrial, portable, SLI, and other/pending.
Industrial batteries are further classified by rated energy, stationary use,
and BMS presence. The five imported BatteryPass-Ready JSON files are technical
validation configurations, not five legal battery categories.

Battery-passport applicability is derived as follows:

- EV and LMT: required;
- industrial above 2 kWh: required;
- industrial at or below 2 kWh: not required by the battery-passport threshold;
- industrial without confirmed capacity: conditional;
- portable and SLI: not automatically required by category alone;
- other: manual classification required.

## Reference Data

`config/battery/battery-pass-ready-longlist-v1.3.json` contains all 100 source
attributes: 78 static and 22 dynamic. Every normalized field has bilingual
labels, Chinese entry guidance, data behavior, granularity, access level,
requirement status by category, evidence guidance, workflow placement, and
source-schema pointers. Source JSON hashes and every mapped pointer are checked
by integration tests.

Portable and SLI field applicability is deliberately `TBD`; the system does not
invent BatteryPass-Ready requirements where the reference models provide none.

## Data And Access

Battery data is separated into model, batch, item, operating metric, and
lifecycle layers. Operating metrics and lifecycle events are append-only.
Corrections create a new record rather than rewriting history.

The public battery endpoint performs access filtering on the server. Supported
levels are `PUBLIC`, `LEGITIMATE_INTEREST`, `AUTHORITY_ONLY`, and `INTERNAL`.
Restricted projections require an authenticated user with an explicit
`dpp_access_level` application-metadata claim. Client-side hiding is not used as
an access-control mechanism.

The complete battery workspace, operating-data append operations and
BatteryPass export require `dpp_access_level=INTERNAL`. A normal authenticated
session is not sufficient. Public rendering also strips legacy SoH and SoC
sector fields before serializing page data.

## Operating Data Policy

The DPP stores periodic or event-driven item snapshots; it is not a public
real-time BMS dashboard.

- EV, LMT and stationary industrial batteries use BMS snapshots at least daily
  and after material status or safety events.
- Other industrial batteries above 2 kWh use a device gateway where available,
  with verified service snapshots as the fallback.
- Industrial batteries without BMS record signed commissioning, inspection,
  repair, repurposing and end-of-life snapshots. The system must not fabricate
  live telemetry.
- Portable and SLI operating data remains voluntary because those categories
  do not automatically enter the Article 77 battery-passport scope.
- SoH, SoC, temperature, cycle, throughput and exception data always remains
  item-level, append-only and limited to approved legitimate-interest access.

## Workflow And Readiness

The editor has 11 steps: identity, economic operator, manufacturing, materials
and chemistry, sustainability, performance, documents, circularity/safety,
item operation, preview/publish, and Registry readiness.

Readiness is never shown as one compliance score. Confirmed mandatory,
conditional, evidence, verification, Registry, and TBD dimensions remain
separate so missing evidence cannot be disguised by unrelated completed fields.

## Activation Boundary

The module is behind `NEXT_PUBLIC_FEATURE_BATTERY_DPP_V2` and is disabled by
default. Apply and validate migrations through `0010`, configure the server-only
service-role key, and test RLS in Preview before enabling it. The current
Registry measure is local preparation only; it does not claim successful EU
central-registry registration or final registry-semantic compatibility.
