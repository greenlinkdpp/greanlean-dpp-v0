# 11 Architecture Decisions Summary

## Accepted decisions — Architecture Baseline v2.0

| ADR | Decision | Status | Consequence |
|---|---|---|---|
| ADR-001 | Tenant and Organisation are separate | ACCEPTED | explicit workspace boundary; V1 organisation requires mapping |
| ADR-002 | Partner access requires Partner–Tenant authorization | ACCEPTED | platform-level Partner; no Tenant Organisation FK or admin shortcut |
| ADR-003 | flexible Model/SKU/Batch/Item graph; Batch is Model-owned | ACCEPTED | Batch–SKU link supports 0:N; Family optional |
| ADR-004 | DPP Passport identity and Version are separate | ACCEPTED | stable identity; one active Passport per subject/profile |
| ADR-005 | Schema Registry is the sole authority for new fields | ACCEPTED | legacy field systems become compatibility sources |
| ADR-006 | canonicalization starts at ingestion and Provenance is first-class | ACCEPTED | mapping/version lineage and no silent field loss |
| ADR-007 | current immutable DPP Version is the only formal publication source | ACCEPTED | all formats agree; live fallback retired per Passport |
| ADR-008 | Resolver owns stable identifier/URL mapping independently of Registry | ACCEPTED | QR survives Registry changes and internal migrations |
| ADR-009 | V1 and V2 APIs coexist | ACCEPTED | additive migration, explicit `/api/v2`, compatibility window |
| ADR-010 | external standards/systems are adapters | ACCEPTED | core model remains stable across standards/providers |

## Consolidated invariants

1. Every V2 business resource has exactly one Tenant owner.
2. Organisation is not Tenant; Partner is not Tenant and not its parent.
3. No Partner access exists without active, in-scope authorization.
4. Partner is platform-level and never references Tenant-owned `organisation_v2`.
5. Tenant Membership references only a same-Tenant `TENANT` Role through a database constraint.
6. Product Family is optional; Batch belongs to Model and may link to multiple SKUs.
7. Individual belongs to Tenant + Model; SKU and Batch are optional but must match Tenant/Model.
8. Field resolution uses explicit state, never overloaded `null`.
9. Passport identity remains stable while published versions are immutable.
10. Passport uniqueness is Tenant + subject type + subject ID + Passport Profile.
11. One current pointer identifies the formal published version.
12. All output formats derive from that same version.
13. New fields originate only in Schema Registry.
14. Canonical claims retain mapping and provenance lineage.
15. Roles map to capabilities; PDP and RLS share Tenant semantics.
16. Identifiers and aliases resolve through one Resolver, not Registry state.
17. V1 remains operational until measured, approved cutover.
18. Production changes require separate instructions and verified rollback.

## Current repository disposition

| Category | Disposition |
|---|---|
| Next.js/Supabase/Auth foundation | retain |
| current Schema Registry | retain and make authoritative |
| canonical publication/review foundation | retain concepts; generalize subject identity |
| battery Model/Batch/Item | retain as sector extension and migration source |
| file/evidence/lifecycle | retain and add Tenant-safe ownership |
| Registry TEST adapter | retain as external adapter |
| `products` and fixed domain tables | compatibility source; no immediate deletion |
| `dpp_field_templates` and parallel field values | map and stop expanding for V2 |
| live public fallback | observe/shadow, then disable per migrated Passport |

## Development boundary

Architecture acceptance does not itself approve coding against Production. Phase 0 first proves Production identity, schema/RLS, recovery, secrets and compatibility. Phase 1 is limited to the Tenant/Partner/access-control core and must remain additive and feature-flagged.

## Acceptance record

- Accepted at: 2026-09-23
- Architecture Baseline Version: 2.0
- ADR-001 through ADR-010: `ACCEPTED`
- Supersedes: none
- Production Baseline remains `BLOCKED`; this acceptance authorizes only isolated Local/Development Phase 1 work.
