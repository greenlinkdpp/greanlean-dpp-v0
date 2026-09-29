# PreProd Password Reset Hotfix

Date: 2026-09-29  
Source RC: `821e20eb36b500b1178db7939df62fd218f853d3` / `d49ac3f1e06db3ec61b14caae04431c8692b7aeb`  
PreProd project: `greanlean-dpp-preprod`  
Deployment: `dpl_4tvMfmxG18uQtFMFce9LiEqaxzrh`  
Stable alias: `https://greanlean-dpp-preprod.vercel.app`

## Hotfix scope

- Added bilingual `Forgot password?` / `忘记密码？` entry to the existing login page.
- Added `/forgot-password` using the existing Supabase Auth `resetPasswordForEmail` flow and same-origin `/reset-password` callback.
- Added `/reset-password` using the existing Supabase Auth recovery session and `updateUser({ password })`, with confirmation, invalid/expired-link, and success states.
- Success returns to `/login?lang=<locale>&reset=success`; no arbitrary redirect parameter is accepted.

## Verification

- Targeted contract/security tests: 5 passed, 0 failed.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- Hosted PreProd build/deployment: PASS.
- Browser QA: Chinese and English login/forgot-password pages render the required controls; unknown-email request returns the same neutral response; invalid reset link returns a safe error.
- Owner mailbox reset was not requested or intercepted. No credentials, reset tokens, passwords, or email contents were read or recorded.
- No account enumeration, open redirect, reset-token logging, or password logging path was introduced.

Production was not deployed, written, traffic-switched, or Auth-configured. Production File Import remains disabled and Phase 8 was not started.
