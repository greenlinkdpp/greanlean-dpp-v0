# Resolver, API, URL, and QR compatibility

## Resolver cutover plan

- Preserve `/p/{identifier}`, GS1 Digital Link `/01/{gtin}`, legacy slugs, DPP IDs, and current aliases.
- Never reassign a historical URL or identifier to another Passport.
- Keep a versioned alias ledger and bounded redirects; validate cache headers, ETag, tombstones, language, and rollback behavior.
- Existing QR codes must continue to resolve through the same public hostname or an owner-approved stable redirect. Reprinting is a Critical compatibility blocker.
- The V2 QR format builds only approved Resolver origins, but legacy `/api/qr?url=` still accepts arbitrary URLs and must be restricted or explicitly deprecated.

## Current evidence

Unit/integration tests prove immutable-version identity across HTML, JSON-LD, PDF, and QR and validate allowlisted V2 QR origins. Public domains respond, but no Production QR sample inventory, access logs, cache telemetry, alias collision scan, or paired Pre-Production compatibility corpus was available. Existing Production QR usability is therefore **UNKNOWN**, not PASS.

## API V1 inventory

| Surface | Disposition | Reason |
|---|---|---|
| `/api/v1/organisations/current` and `/export` | ADAPT | Organisation contract must remain while V2 tenant/organisation stabilizes |
| `/api/v1/product-models/[productId]/hierarchy` | ADAPT | Existing hierarchy consumer; compare with V2 product core |
| `/api/v1/product-models/[productId]/items-bulk` | KEEP | Existing bulk item workflow |
| `/api/v1/projects` and `/[projectId]` | KEEP | Current back-office workflow |
| `/api/v1/projects/[projectId]/applicability` | KEEP | Current applicability workflow |
| `/api/v1/imports/preflight` and `/[jobId]/commit` | ADAPT | Map gradually to V2 imports; preserve behavior |
| `/api/battery-dpp/**`, `/api/dpp-*`, `/api/registry/**` | DEPRECATE_LATER | Compatibility endpoints; removal requires usage and migration evidence |
| `/api/internal/**` | INTERNAL_ONLY | Server/operator boundary; inventory consumers before change |
| `/api/qr` | DEPRECATE_LATER | Arbitrary URL behavior requires security-compatible replacement |
| Any endpoint without deployment telemetry | UNKNOWN_USAGE | No assumption of zero use is allowed |

No endpoint was deleted. `COMPATIBILITY_GATE = BLOCKED` pending telemetry, QR samples, and Pre-Production shadow compare.
