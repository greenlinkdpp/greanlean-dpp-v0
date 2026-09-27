# Phase 6B Production change request

Status: **PENDING EXPLICIT OWNER APPROVAL — NOT EXECUTED**

This request records every currently known mutation boundary. Approval of the Phase 6B work itself does not approve any item below. Each item requires an explicit owner decision; implementation must be limited to the approved item and followed by read-only verification.

## PCR-01 — Backup and PITR capability

- **change:** Upgrade or configure the Production Supabase project so scheduled backups and, if selected, Point-in-Time Recovery are enabled and retention is documented.
- **reason:** No verifiable recovery source or retention evidence exists; a restore drill cannot start.
- **current evidence:** Phase 6 and Phase 6B can verify the project and data read-only, but no backup/PITR evidence or restorable artifact is available.
- **risk:** Billing impact; a configuration change may alter retention and operational responsibility. Backups may temporarily affect database performance.
- **rollback:** Disable the newly enabled add-on or revert the plan/configuration after preserving required compliance evidence; disabling does not recreate missing recovery history.
- **expected impact:** A measurable recovery source becomes available and an isolated restore drill can be scheduled.
- **owner:** Product/Platform Owner and Supabase billing owner.
- **approval required:** **YES — explicit written approval and billing authorization.**

## PCR-02 — Production release deployment

- **change:** After a Pre-Production release candidate passes all Phase 6B gates, deploy the fixed commit containing the supported Next.js version, security headers, request capacity controls, pagination bound, and public rate controls to Vercel Production.
- **reason:** The current Production response lacks CSP, `X-Content-Type-Options`, and anti-clickjacking headers; the deployed revision is not yet evidenced; the repository baseline used Next.js 14.2.15.
- **current evidence:** Public `GET`/`HEAD` probes on 2026-09-26 show HSTS but no CSP, `nosniff`, or `X-Frame-Options`. Read-only Vercel evidence identifies the current Production deployment as Git SHA `796a0b6367f311d94347ef17415c6c417cbdaae6`. Local remediation is not a Production deployment and no hosted PreProd frontend exists.
- **risk:** Framework upgrade and CSP can affect rendering, authentication, public resolver formats, QR/PDF generation, caching, and integrations. The current in-process rate limiter is not sufficient as the sole multi-instance Production control.
- **rollback:** Redeploy the previously evidenced Production commit and restore the prior Vercel configuration. Do not roll back database state as part of this code-only item.
- **expected impact:** Production receives the validated application security controls without switching V2 traffic or enabling Registry actions.
- **owner:** Application Owner and Vercel deployment owner.
- **approval required:** **YES — only after Pre-Production PASS and a fixed release-candidate SHA.**

## PCR-03 — Distributed public rate limiting / WAF

- **change:** Configure an approved distributed rate-limit store or Vercel firewall/rate-limit rules for Resolver, public DPP JSON/HTML, QR, and identifier lookup routes.
- **reason:** The local code supplies bounded per-instance protection and correct `429`/`Retry-After` behavior, but cannot enforce a global limit across multiple serverless instances.
- **current evidence:** `lib/server/publicControls.ts` and `middleware.ts` implement the route contract; there is no approved shared store or verified Production edge rule.
- **risk:** Incorrect limits can deny legitimate scans or fail to mitigate distributed abuse; vendor rules may add cost.
- **rollback:** Disable the new edge/shared-store rules and retain the local per-instance safety net while limits are recalibrated.
- **expected impact:** Consistent bounded burst control across Production instances.
- **owner:** Security/Platform Owner and Vercel billing owner.
- **approval required:** **YES — provider, limits, cost, and exemptions must be approved.**

## PCR-04 — Database/RLS remediation, if catalog verification identifies a defect

- **change:** Apply only a separately reviewed additive migration that corrects a specific policy, grant, function, or trigger defect found by the remaining Production catalog/runtime verification.
- **reason:** Anonymous negative probes pass for sampled sensitive tables, but authenticated cross-tenant tests and the complete `pg_policy`/grant/function catalog have not been verified.
- **current evidence:** `docs/v2-implementation/phase-6b/evidence/production-closure.json`; no concrete defect is currently authorized or proposed.
- **risk:** An incorrect RLS/grant change can expose tenant data or interrupt V1.
- **rollback:** A paired, pre-tested reverse migration and immediate read-only policy/runtime verification are mandatory. Kill switches do not replace RLS rollback.
- **expected impact:** Closure of a named defect only; no V2 Production migration and no broad policy rewrite.
- **owner:** Database Owner and Security Owner.
- **approval required:** **YES — blocked until a concrete diff, SQL, tests, and rollback are attached.**

## Explicit exclusions

This request does **not** authorize Production V2 migrations, V1→V2 data migration, traffic switching, Registry submission, secret rotation, tenant cutover, or Pilot execution.
