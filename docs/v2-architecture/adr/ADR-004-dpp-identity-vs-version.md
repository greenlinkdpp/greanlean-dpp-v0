# ADR-004: DPP Identity vs Version

## Context

V1 exposes stable DPP identifiers while publication data appears in product versions, canonical publication tables and pointers.

## Problem

Treating a mutable product row or publication snapshot as both Passport identity and content makes correction, supersession, withdrawal and stable QR resolution ambiguous.

## Decision

Create `dpp_passport` as stable subject-bound identity and `dpp_version` as immutable content. Passport includes `passport_profile_code` (default `PRIMARY`) so one subject may hold separate regulatory or market Passports. At most one active Passport exists per Tenant, subject type, subject ID, and profile. A current pointer selects at most one published version. Withdraw and supersede preserve history.

## Alternatives Considered

1. Version the whole Passport row — rejected because stable identity and mutable lifecycle conflict.
2. Overwrite one JSON snapshot — rejected because audit and correction history are lost.
3. Keep product ID as Passport ID — rejected because one subject level and one product aggregate are not always equivalent.

## Why

The split gives durable URLs/QRs, immutable evidence, deterministic public output and explicit version lifecycle.

## Consequences

- publication requires transactional version/pointer operations;
- storage grows append-only;
- caches key on version/payload hash;
- corrections create new versions rather than UPDATE.

## Migration Impact

Eligible V1 publications map only when subject, schema, version and hash can be established. Ambiguous snapshots remain behind the compatibility adapter.

## Compatibility

Old DPP IDs/slugs/aliases resolve to the new Passport. V1 responses can be projected from a V2 version after shadow validation.

## Security Impact

Published payload UPDATE/DELETE is database-blocked. Pointer and supersedes relationships enforce same Tenant/Passport. Audience projection does not mutate the source version.

## Open Questions

- governance of future Passport Profile codes;
- withdrawn public response policy;
- retention requirements;
- version-number reset/format rules.

## Status

`ACCEPTED`

- Accepted At: 2026-09-23
- Architecture Baseline Version: 2.0
- Supersedes: none
