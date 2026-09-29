# Consolidated Backoffice and navigation RC

Date: 2026-09-29  
PreProd deployment: `dpl_7ntfD7zmosspCRhBM3invmRYsZXX`  
Immutable URL: `https://greanlean-dpp-preprod-fhtnfm97j-songweinie-1175s-projects.vercel.app`  
Stable alias: `https://greanlean-dpp-preprod.vercel.app`

## Included behavior

This consolidated candidate preserves the accepted homepage/login/Backoffice/Demo navigation from commit `72453e9a7965b2ce06dbe9feda7b07ecaa57c6a6` and adds the v2.1 Platform Operator model:

- Platform Admin login defaults to `/dashboard/platform`.
- A safe validated internal `next` route remains honored; open redirects remain rejected.
- Tenant workspace and platform console link back to the website and Reference Demo.
- Platform and Tenant scopes are labeled in text, not color alone.
- The active Tenant persists across Tenant-workspace navigation.
- Future Tenant users remain routed through membership-bound `/dashboard/v2` semantics.

The exact candidate passed lint, typecheck, unit/integration tests, migration contract tests, production build, Platform capability tests, forged-context tests, cross-Tenant mutation tests, and hosted browser checks. The final frozen commit SHA and clean-tree status are recorded after the freeze in the task completion report; the tracked/untracked file inventory is retained in `docs/v2-implementation/phase-7/evidence/platform-admin-multitenant-rc-files.txt`.

## Logo boundary

No owner-approved GreanLean logo file was supplied with the instruction. No logo was invented, generated, traced, downloaded, or substituted. Existing repository text/image branding was not asserted to be the requested official asset.

```text
NAVIGATION_CONSOLIDATION = PASS
OWNER_LOGO_ASSET_REQUIRED = TRUE
LOGO_INTEGRATION = PENDING_OWNER_ASSET
PRODUCTION_DEPLOYED = NO
OBSERVATION_WINDOW_RESTART_REQUIRED = NO
```

请发送 GreanLean 正式 Logo 图片文件。首选 SVG；透明 PNG 也可以。如有浅色和深色版本，请同时提供。
