# Phase 7 — Confirmed Write Workflow Implementation

Generated: `2026-09-28`

## Result

```text
CONFIRMED_WRITE_WORKFLOW_IMPLEMENTATION = PASS
CONFIRMED_WRITE_PATH_COMPLETE = TRUE
NO_DIRECT_PUBLICATION_BYPASS = TRUE
FRESH_BACKUP_GATE_IMPLEMENTED = TRUE
```

The previously locked Production path is now a fail-closed confirmed-write workflow. The public entry point remains `scripts/phase7/build-internal-reference-production-pilot.mjs`; both isolated PreProd verification and the future Production execution delegate to `scripts/phase7/internal-reference-confirmed-write-core.mjs`. This keeps one orchestration implementation while giving each environment a fixed project identity, resolver host, Tenant namespace, and execution boundary.

## Execution boundary

Production execution requires all of the following at the same time:

- the sole confirmation argument `--confirm-internal-reference-production-pilot`;
- `DPP_ENVIRONMENT=production` and exact project `lpxdbysgmdsjhxrjzhly`;
- migration head `0035` and the approved fixture SHA-256;
- V2 Primary, Registry, and real customer connectors disabled;
- no foreign natural-key collision or inconsistent partial state;
- exact checked-out commit/tree equality with `DPP_APPROVED_RC_COMMIT` and `DPP_APPROVED_RC_TREE`;
- a JSON file named by `DPP_MANAGED_BACKUP_EVIDENCE_FILE` whose project matches Production, status is `COMPLETED`, timestamp is not in the future and is no more than 24 hours old, and reference is non-empty.

Any failed condition terminates before the shared writer is invoked. Dry-run remains the default. No credential is printed or stored in evidence.

## Write design

The workflow is resumable by stable natural keys: Tenant code, Organisation legal name, family/model/SKU code, batch number, serial, passport identifier, fixture/source hash, mapping profile/version, and schema code/version. Before execution it rejects any matching identifier owned by another Tenant. Existing own-Tenant records must match the expected fixture classification and topology.

The publication chain uses authenticated application APIs for mapping dry-run/commit, passport candidate creation, review submission, approval, publication, and resolver mapping. It never inserts into `dpp_version` or `dpp_current_pointer` directly. Author, reviewer, and publisher are three distinct synthetic technical identities with separate Tenant roles.

Controlled repository writes remain for foundation resources without a dedicated orchestration endpoint: Tenant/Organisation, product hierarchy, source definitions/records, schema/mapping definitions, identifiers, and synthetic BMS snapshots. Those writes remain Tenant-scoped and idempotent. They do not bypass publication, approval, immutable-version, pointer, or resolver controls.

Registry submission is not part of this workflow. V2 Primary is not enabled. The future Production resolver host is fixed to `www.greanlean.com`; the PreProd verification host is fixed to `greanlean-dpp-preprod.vercel.app`.

## Implementation files in the RC

- `scripts/phase7/build-internal-reference-preprod.mjs`
- `scripts/phase7/build-internal-reference-production-pilot.mjs`
- `scripts/phase7/internal-reference-confirmed-write-core.mjs`
- `scripts/phase7/internal-reference-safety.mjs`
- `tests/integration/internalReferenceConfirmedWriteContract.test.mjs`

The RC contained 919 tracked files and no untracked files. Generated `.next`, `.vercel`, coverage, local environment files, and temporary verification output were excluded.

## Contract verification

The dedicated contract suite passed 6/6 checks covering explicit confirmation, exact RC binding, fresh backup ordering, shared PreProd/Production orchestration, publication API use, no immutable-table bypass, environment-specific resolver hosts, collision rejection, and zero-net-new plan guards.

```text
PRODUCTION_APPLICATION_DEPLOYED = NO
PRODUCTION_DATA_WRITE_PERFORMED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
```
