# Greanlean DPP

Greanlean is a Next.js and Supabase platform for preparing, validating,
publishing, and presenting Digital Product Passports. The current product keeps
five industry tracks: battery, textile, furniture, construction materials, and
consumer electronics.

Version 0.5 uses one public DPP page system across industries. Public visitors
receive the published public projection, while approved signed-in users receive
server-authorized professional or regulatory data. Battery passports can also
show restricted operating snapshots, history, and lifecycle events.

## Routes

- `/` public website
- `/login` workspace login
- `/dashboard` workflow overview
- `/dashboard/products` product center
- `/dashboard/import` CSV/XLSX import center
- `/dashboard/suppliers` supplier library
- `/p/DPP-LMT-BAT-48V15AH` LMT battery passport
- `/p/DPP-GV-ESS-14K3-000001` stationary industrial battery passport
- `/p/DPP-SFJK-31-1-REC` textile passport
- `/p/DPP-CE-EARBUDS-001` consumer-electronics passport
- `/p/DPP-WPC-MS140K25B` construction-material demo
- `/p/DPP-FURN-DEMO-001` furniture demo
- `/dashboard/access` organisation access-request management

Public DPP pages support `lang=zh|en` and audience views selected by the
server authorization layer. URL query parameters cannot elevate access. Public
JSON/PDF export is generated from the same published product version as the
web page.

## Local Development

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Environment variables and feature flags are
documented in [environment-matrix.md](docs/engineering/environment-matrix.md).

## Quality Checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:migrations
npm run build
```

With a local server running:

```bash
BASE_URL=http://localhost:3000 npm run test:smoke
```

The dependency-free lint script checks repository hygiene; TypeScript performs
the semantic source check. CI runs the complete non-browser suite on every push
and pull request.

## Database

`supabase/schema.sql` is the legacy bootstrap snapshot for a fresh copy of the
current demo database. Do not append new production changes to it.

All new changes use paired files:

```text
supabase/migrations/NNNN_name.sql
supabase/rollbacks/NNNN_name.down.sql
tests/migrations/NNNN_name.test.mjs
```

Read [database-migrations.md](docs/engineering/database-migrations.md) before
applying SQL. Unified DPP publication, identity/access, and battery operating
data are installed by migrations `0012`, `0013`, and `0014`, each with a paired
rollback and verification bundle.

## Architecture And Regulation

- [Product specification](SPEC.md)
- [Implementation plan](PLAN.md)
- [Unified DPP platform PRD](docs/Greanlean_Unified_DPP_Platform_Redesign_PRD_v0.1.md)
- [Unified DPP page structure](docs/requirements/unified-dpp/page-structure.md)
- [Identity and access implementation](docs/requirements/unified-dpp/phase-4-identity-access.md)
- [Battery operating-data integration](docs/requirements/unified-dpp/phase-5-battery-operating-data.md)
- [Test and release acceptance](docs/requirements/unified-dpp/phase-6-test-release.md)
- [Target architecture](docs/architecture/target-architecture.md)
- [Database design](docs/architecture/database-design.md)
- [Current-system audit](docs/architecture/current-system-audit.md)
- [Battery demo impact analysis](docs/requirements/battery-demo/current-impact-analysis.md)
- [Battery migration mapping](docs/regulatory/eu-battery-dpp/migration-mapping.md)
- [Known regulatory uncertainties](docs/regulatory/eu-battery-dpp/known-uncertainties.md)
- [Engineering documentation index](docs/engineering/README.md)

BatteryPass-Ready reference models are treated as versioned mapping and
validation sources. They are not represented as final EU Registry semantics.

The Phase 4 battery module includes six legal battery categories, five imported
BatteryPass-Ready validation configurations, a normalized 100-field longlist,
append-only operating metrics, and server-side access projections. See
[phase-4-implementation.md](docs/regulatory/eu-battery-dpp/phase-4-implementation.md).

The Registry adapter generates traceable TEST mapping files, performs
local validation, and records manual results and retries. It keeps PRODUCTION
disabled and cannot mark battery registration successful until an official
battery semantic catalogue is available. See
[phase-5-implementation.md](docs/regulatory/eu-battery-dpp/phase-5-implementation.md).

Battery operating-data APIs support credential hashing, idempotency, unit and
range validation, append-only ingestion records, and server-side access
projection. They are integration endpoints, not a replacement for BMS, EMS, or
SCADA software.

## Deployment

Deployments must pass local/CI checks and use a preview environment before
production. Preview must not write to the production database. See
[deployment.md](docs/engineering/deployment.md) for the release and rollback
checklist.

Production: `https://www.greanlean.com`
