# Hosted PreProd Backoffice QA Report

Date: 2026-09-28  
Target: `greanlean-dpp-preprod` only  
Production change: none

## Automated verification

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| Repository hygiene/lint | PASS |
| Unit suite | PASS — 122 tests |
| Integration suite | PASS — 101 tests |
| Combined application suite | PASS — 223 tests |
| Production build | PASS — all application routes request-rendered for CSP nonce propagation; V2 Backoffice routes present |
| Migration suite | PASS — 56 tests |
| CSP nonce | PASS — response nonce matches all 16 framework script nonces on the Hosted PreProd login page |

## Hosted verification

Hosted PreProd deployment `dpl_FaKXuihKgJm8eJw1vQR8nv9Fj4na` from commit `4c0aa4a306fc7f62a57e374d07f57f55e84fbda0` is READY at the stable alias. Public route, SOODOO public DPP, authentication boundary and security headers passed HTTP verification.

Real-browser authentication exposed and closed two deployment defects before acceptance:

1. Static HTML did not receive the per-request CSP nonce, so hydration was blocked. Request rendering now propagates the nonce to framework scripts.
2. `DashboardShell` evaluated the legacy V1 dashboard gate before the V2 Tenant context. A valid V2-only SOODOO Tenant administrator was therefore redirected to the public homepage. V1 and V2 contexts are now evaluated independently: V2-only users can enter only `/dashboard/v2`, while legacy routes retain the legacy authorization gate.

Authenticated Chrome QA used the existing synthetic `phase7-soodoo-publisher@greanlean.example` Tenant administrator. Its PreProd-only password was rotated to a random temporary value for the walkthrough; the value was not recorded and the local clipboard was cleared. The console resolved exactly one selectable Tenant, `SOODOO E-bike`, and displayed the expected synthetic baseline: one Organisation, one Family, one Model, one SKU, one Batch, three Individuals, three Passports and three published versions.

The walkthrough covered the dashboard, product-model relationship view, file-import preflight boundary, review/publication history, identifiers and DPP IDs, BMS snapshots, and audit history. Source-level route/component contracts cover the remaining navigation surfaces because every section uses the same authenticated Tenant snapshot and section router. English and Simplified Chinese rendered correctly. The console remained usable in a 768-pixel-wide Chrome window. No form was submitted and no synthetic business record was added or changed during QA.

One non-blocking Auth configuration observation remains: admin-generated magic links use the Supabase project `Site URL` of `http://localhost:3000`. Password login is the supported deployed path and passed; configure an allowlisted Hosted PreProd Auth callback before enabling passwordless login. Severity: LOW.

Final read-only Production smoke after the PreProd deployment returned HTTP 200 for the homepage, representative public DPP and representative public API.

## Acceptance result

All required Backoffice surfaces and security boundaries are PASS. Critical issues: 0. High issues: 0. The passwordless callback observation is LOW and does not affect the approved password-login workflow.

## Boundaries

- No Production application deployment.
- No Production data write or migration.
- No Production traffic switch.
- No Phase 8 work.
