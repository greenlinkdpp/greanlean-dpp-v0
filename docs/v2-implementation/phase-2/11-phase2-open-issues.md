# 11 Phase 2 Open Issues

## Non-blocking decisions deferred by scope

| Topic | Status | Later decision |
|---|---|---|
| Product Family usage | optional | decide per sector/product taxonomy |
| Legacy `products.sku` meaning | review required | validate source semantics before creating SKU |
| Identifier issuer/scheme governance | structurally supported | define controlled catalog and ownership policy |
| Passport subject and DPP/Registry/Credential identifiers | reserved and rejected | enable only with later Passport/Registry architecture |
| Batch–SKU temporal overlap rules | active uniqueness/link validity implemented | decide whether overlapping historical links require stricter governance |

## Explicitly out of scope

Canonical Claim, Field Value Resolution, Schema Migration, full provenance, DPP Passport/version/publication, resolver/public QR, Registry Production, VC, UNTP, Catena-X, and EDC remain outside Phase 2. None is an acceptance blocker for Product Core.

## Blocking issues

None for Phase 2 acceptance. The deferred topics above require explicit later-phase business or architecture decisions and were not silently implemented.
