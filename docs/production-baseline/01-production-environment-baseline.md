# 01 Production Environment Baseline

## Verification scope

- Verified at: `2026-09-23T13:05:04Z` (`2026-09-23 06:05:04 PDT`)
- Mode: read-only; no write, DDL, migration, deployment, secret rotation, file download, QR generation, Registry call, or BMS ingestion was performed.
- Evidence labels:
  - **VERIFIED**: observed from a public runtime response or local linked-project metadata.
  - **REPOSITORY EXPECTED**: observed in the audited repository, not proven installed in Production.
  - **NOT VERIFIED**: the required management/database read-only access was unavailable.

## Production identity

| Component | Result | Evidence | Status |
|---|---|---|---|
| Vercel project | `greanlean-dpp-v0` | `.vercel/project.json`; project ID begins `prj_QOva…`, team ID begins `team_vC4…` | VERIFIED as locally linked; Production ownership NOT VERIFIED |
| Vercel runtime | Public responses identify `server: Vercel` | `www`, `dpp`, and default Vercel domain HTTPS responses | VERIFIED |
| Edge request region | `iad1` during the sample | `x-vercel-id`; this is request-edge evidence, not configured data residency | VERIFIED sample |
| Supabase project | Project hostname begins `lpxd…` and ends `.supabase.co` | `.env.local`, value redacted | VERIFIED as locally configured target; Production classification NOT VERIFIED |
| Production database | Same Supabase target is used by local configuration | anonymous read-only REST probes succeeded | Database identity/region NOT VERIFIED |
| Production storage | Expected Supabase Storage bucket `dpp-evidence` | repository migration and server code | NOT VERIFIED in Production |
| Primary marketing domain | `greanlean.com` redirects to `https://www.greanlean.com/` | public HTTPS request | VERIFIED |
| DPP application domain | `https://dpp.greanlean.com/` redirects to `/login` | public HTTPS request | VERIFIED |
| Default Vercel domain | `https://greanlean-dpp-v0.vercel.app/` returns HTTP 200 | public HTTPS request | VERIFIED |
| `app.greanlean.com` | no verifiable HTTPS service in the sample | DNS/TLS probe | NOT CONFIGURED / NOT VERIFIED |
| `api.greanlean.com` | no verifiable HTTPS service in the sample | DNS/TLS probe | NOT CONFIGURED / NOT VERIFIED |

## Deployment version

| Item | Value |
|---|---|
| Repository branch | `main` |
| Repository audit commit | `796a0b6367f311d94347ef17415c6c417cbdaae6` |
| Repository commit time | `2026-09-14T22:13:42-07:00` |
| Repository Next.js | `14.2.15` |
| Production deployment commit | **NOT VERIFIED** |
| Production branch | **NOT VERIFIED** |
| Production deploy time | **NOT VERIFIED** |
| Production build ID | **NOT VERIFIED** |
| Production Next.js exact version | **NOT VERIFIED** |
| Production environment variables | **NOT VERIFIED** |

The unauthenticated Vercel deployments API returned HTTP 403. Public page fingerprints prove that a build is serving traffic but cannot establish its Git commit.

```text
Production commit: NOT VERIFIED
Repository audit commit: 796a0b6367f311d94347ef17415c6c417cbdaae6
Drift: UNKNOWN
```

## DNS, TLS, and redirects

| Host | DNS/public behavior | TLS sample | HSTS sample |
|---|---|---|---|
| `greanlean.com` | A `76.76.21.21`; redirects to `www` | valid HTTPS | final response verified through redirect |
| `www.greanlean.com` | CNAME `cname.vercel-dns.com` | Let's Encrypt; valid `2026-09-19` to `2026-12-18` | `max-age=63072000` |
| `dpp.greanlean.com` | CNAME `cname.vercel-dns.com`; `/` → `/login` | Let's Encrypt; valid `2026-09-22` to `2026-12-21` | `max-age=63072000` |
| default Vercel host | HTTP 200 | valid HTTPS | `max-age=63072000; includeSubDomains; preload` |

Custom tenant domains, DNS ownership controls, certificate automation policy, and canonical-host enforcement are **NOT VERIFIED**.

## Environment classification conclusion

The public domains look operational and point to Vercel, while the repository is linked to a Vercel project and configured with a Supabase project. There is no management-plane evidence that proves which Vercel deployment, Git commit, Supabase project, database region, or environment-variable set is the authoritative Production combination.

**Environment identity status: PARTIALLY VERIFIED.**
