# Current Execution Status and Supabase Organisation State

Captured: 2026-09-27.

| Environment | Organisation | Project ref | State | Migration head |
|---|---|---|---|---|
| Production (`greanlen-dpp`) | `GreanLean` Pro | `lpxdbysgmdsjhxrjzhly` | `ACTIVE_HEALTHY` | `0026` |
| Development (`greanlean-dpp-dev`) | `GreanLean Dev` | `qlrbrwrpvtnlphajvqao` | `INACTIVE` / paused | `0032` |
| PreProd (`greanlean-dpp-preprod`) | `GreanLean Dev` | `efhiaufukjchxqhbmpvq` | `ACTIVE_HEALTHY` | `0033` |

The authorised temporary project `greanlean-dpp-restore-drill-20260927` restored the latest completed Production physical backup, passed validation in 4m14s, and was permanently deleted. Its absence was verified.

Production remained `ACTIVE_HEALTHY`; project ref, region, migration head, V1 data baseline, public routes, Registry state, and traffic routing were unchanged. Development remains paused.

The next action is to stop and wait for Phase 6B acceptance. Phase 7 is not authorised.

`PRODUCTION_WRITE_PERFORMED = NO`

`PRODUCTION_TRAFFIC_SWITCHED = NO`
