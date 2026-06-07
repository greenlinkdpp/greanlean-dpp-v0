# greanlean DPP

Next.js + Supabase based Digital Product Passport demo and admin workspace for EU DPP / ESPR data preparation.

## Current Pages

- `/` public website
- `/login` DPP workspace login
- `/dashboard` workflow overview
- `/dashboard/products` product center
- `/dashboard/import` CSV / XLSX import center
- `/dashboard/suppliers` supplier library
- `/p/DPP-DEMO-001` textile DPP demo
- `/p/DPP-AUDIO-DEMO-001` consumer electronics DPP demo
- `/p/DPP-WPC-MS140K25B` WPC flooring DPP demo
- `/p/DPP-FURN-DEMO-001` furniture DPP demo

Each public DPP page supports:

- `?lang=zh` or `?lang=en`
- `?view=simple` or `?view=detail`
- PDF / JSON export through `/api/dpp-export`

## Local Preview First

Use local preview before pushing to production.

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/dashboard
http://localhost:3000/p/DPP-AUDIO-DEMO-001?view=detail&lang=zh
```

Run a production check before deployment:

```bash
npm run build
```

## Environment Variables

Create `.env.local` from `.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

On Vercel, use:

```text
NEXT_PUBLIC_SITE_URL=https://www.greanlean.com
```

## Supabase Setup

For a new database, run this first in Supabase SQL Editor:

```text
supabase/schema.sql
```

To reset testing data and keep only the core textile demo:

```text
supabase/reset_to_demo.sql
```

To add the electronics and WPC flooring demos:

```text
supabase/upsert_demo_products.sql
```

To add the office chair demo:

```text
supabase/upsert_office_chair_demo.sql
```

The SQL scripts are written to be re-runnable where possible. The public DPP pages also include demo fallback data, so demo pages can still render if a demo row is missing from Supabase.

## Admin Access

Create users in Supabase Authentication. The current phase uses one admin-style workspace: authenticated users can manage all products. Company-level account isolation is not implemented yet.

## Import Workflow

Use `/dashboard/import` to:

- download the full XLSX template grouped by Sheet
- download a single-module CSV template
- upload CSV / TSV / XLSX files
- validate required fields, duplicate SKUs, unknown columns, dates, numbers and URLs
- import by SKU

When importing module data, existing rows for the uploaded product/module are replaced before new rows are inserted. This keeps repeated imports from duplicating related DPP records.

## Deployment

Preferred workflow:

1. Preview locally with `npm run dev`.
2. Run `npm run build`.
3. Commit and push to `main`.
4. Vercel deploys the production site.

Production domain:

```text
https://www.greanlean.com
```
