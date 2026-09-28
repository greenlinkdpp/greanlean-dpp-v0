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
| Integration suite | PASS — 100 tests |
| Combined application suite | PASS — 222 tests |
| Production build | PASS — all application routes request-rendered for CSP nonce propagation; V2 Backoffice routes present |
| Migration suite | PASS — 56 tests |
| CSP nonce | PASS — response nonce matches all 16 framework script nonces on the Hosted PreProd login page |

## Hosted verification

Hosted PreProd deployment `dpl_B36MNDVzqNcstJXHB7cJGGyUQLWg` is READY at the stable alias. Public route, SOODOO public DPP, authentication boundary and security headers passed HTTP verification. Browser verification found and remediated a pre-existing CSP integration defect: static HTML did not receive the per-request nonce, so hydration was blocked. The root is now request-rendered and a real browser confirms English hydration works. Authenticated console and responsive observations remain pending only until the operator completes login in the open PreProd tab; no PASS is claimed for those checks yet.

## Boundaries

- No Production application deployment.
- No Production data write or migration.
- No Production traffic switch.
- No Phase 8 work.
