# Greanlean DPP

Greanlean is a Next.js and Supabase workspace for preparing, validating,
publishing, and presenting Digital Product Passports. The current product keeps
five industry tracks: battery, textile, furniture, construction materials, and
consumer electronics.

The repository is being upgraded incrementally. Existing demos remain active
while the versioned Schema Registry and future battery module are introduced
behind feature flags.

## Routes

- `/` public website
- `/login` workspace login
- `/dashboard` workflow overview
- `/dashboard/products` product center
- `/dashboard/import` CSV/XLSX import center
- `/dashboard/suppliers` supplier library
- `/p/DPP-DEMO-001` textile demo
- `/p/DPP-AUDIO-DEMO-001` consumer electronics demo
- `/p/DPP-WPC-MS140K25B` construction-material demo
- `/p/DPP-FURN-DEMO-001` furniture demo
- `/demos/lmt-battery` LMT battery demo
- `/demos/industrial-battery` GreenVault ESS-14.3 industrial battery demo
- `/passports/green-vault-ess-14-3-demo-000001` stable industrial battery passport URL

Public DPP pages support `lang=zh|en` and audience views selected by the
application. JSON/PDF export is available through `/api/dpp-export`.

The GreenVault industrial battery record is synthetic demonstration data. It
does not represent certification, live BMS telemetry, third-party verification,
or a formal EU DPP Registry submission. Apply the idempotent database seed after
the battery migrations:

```text
supabase/seeds/industrial_battery_demo.sql
```

The public route also has a static fallback, so the demo remains available
before the seed is applied. The authenticated Product Hub requires the database
record.

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
applying SQL. Phase 3 migrations are additive and do not modify existing product
or demo records.

## Architecture And Regulation

- [Product specification](SPEC.md)
- [Implementation plan](PLAN.md)
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

The Phase 5 Registry adapter generates traceable TEST mapping files, performs
local validation, and records manual results and retries. It keeps PRODUCTION
disabled and cannot mark battery registration successful until an official
battery semantic catalogue is available. See
[phase-5-implementation.md](docs/regulatory/eu-battery-dpp/phase-5-implementation.md).

## Deployment

Deployments must pass local/CI checks and use a preview environment before
production. Preview must not write to the production database. See
[deployment.md](docs/engineering/deployment.md) for the release and rollback
checklist.

Production: `https://www.greanlean.com`
