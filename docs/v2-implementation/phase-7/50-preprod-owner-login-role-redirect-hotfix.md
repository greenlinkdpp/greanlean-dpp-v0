# PreProd Owner Login Role + Redirect Hotfix Evidence

## Scope

- Environment: `greanlean-dpp-preprod` (`efhiaufukjchxqhbmpvq`)
- Frontend: `https://greanlean-dpp-preprod.vercel.app`
- Accepted baseline RC: `124a4bcc65edd010b349ff804a48c00b986d446e`
- Password-reset hotfix remained present and was not reverted.
- Production was not queried with write credentials, changed, deployed, or traffic-switched.

## Read-only diagnosis

The exact existing Owner account was found in PreProd `auth.users`; no duplicate account was created.

| Check | Result |
| --- | --- |
| `auth.users` match | PASS |
| PreProd auth user ID | `6f769ac1-f063-479c-bdda-42a2b7a45c78` |
| `email_confirmed_at` | `2026-09-30T00:53:06.648648+00:00` |
| `last_sign_in_at` | `2026-09-30T00:57:05.701674+00:00` |
| Active platform assignment before hotfix | 0 |
| Tenant memberships before hotfix | 0 |
| Existing platform role | `platform_operator` / `PLATFORM` / `ACTIVE` |
| PreProd migration head | `0036` |

The login handler already performs the intended role-aware default: it probes `/api/v2/platform/context` and uses `/dashboard/platform` when the authenticated session has platform capability; otherwise it uses the tenant backoffice path. `safeLoginReturnPath` preserves approved same-origin paths and rejects external, protocol-relative, encoded, backslash, and `javascript:`-style redirect forms. The dashboard shell sends unauthenticated or unauthorized users to login/home instead of granting access.

**Root cause:** `MISSING_PLATFORM_ROLE`. The Owner auth identity existed, but it had no active `platform_role_assignment`; this caused the platform context probe to fail and the existing dashboard guard to fall back to the public homepage. No redirect-code defect was found, so no redirect code was changed.

## Minimal PreProd change

After the read-only checks, exactly one existing IAM relationship was added in PreProd:

- `platform_role_assignment.id`: `293c4321-0e0f-4975-b1bb-28c89ea6dfc6`
- `user_id`: `6f769ac1-f063-479c-bdda-42a2b7a45c78`
- role: existing `platform_operator` (`9f17f865-c3bf-4d3d-acf3-ac49ff06461f`)
- status: `ACTIVE`
- `valid_until`: `null`
- Tenant memberships after write: `0`

No Tenant, Organisation, product, passport, migration, or feature flag was changed. No new role definition was created.

## Post-write verification

| Check | Result |
| --- | --- |
| Owner auth identity exists | PASS |
| Email confirmed | YES |
| Active platform role | PASS (`platform_operator`) |
| Tenant memberships | `0` |
| Migration head unchanged at `0036` | PASS |
| Anonymous `/api/v2/platform/context` | DENIED (`401 AUTH_REQUIRED`) |
| Anonymous dashboard guard | Covered by existing dashboard auth guard and targeted contracts |
| External `next` redirect | BLOCKED by `safeLoginReturnPath` tests |
| Forged Tenant context | DENIED by existing platform/backoffice capability contracts |

## Regression tests

Passed:

- 20 targeted Node contract tests covering password reset, login/backoffice linkage, DPP access, platform authority separation, and safe navigation.
- `npm run lint`
- `npm run typecheck`
- Hosted PreProd public pages and unauthenticated platform context probe.

No Owner password, access token, refresh token, reset token, or service key is recorded here.

## Deployment and acceptance boundary

The current hosted PreProd deployment is the already accepted password-reset hotfix deployment:

- Deployment ID: `dpl_4tvMfmxG18uQtFMFce9LiEqaxzrh`
- Stable alias: `https://greanlean-dpp-preprod.vercel.app`

No new application code was required for this IAM-only repair, so no Production deployment was performed. The required real-browser Owner login, `/dashboard/platform` landing, explicit Reference Tenant entry, `/dashboard/v2` refresh, and logout flow remain **OWNER_PENDING** because the host Mac was locked and the Owner password must be entered by the Owner. This document intentionally does not claim those human-acceptance checks as PASS.

## Boundary assertions

```text
PREPROD_IAM_WRITE_PERFORMED = YES (one existing user-to-existing-role assignment)
PRODUCTION_DEPLOYED = NO
PRODUCTION_DATA_WRITE_PERFORMED = NO
PRODUCTION_AUTH_CONFIG_CHANGED = NO
PRODUCTION_TRAFFIC_SWITCHED = NO
```
