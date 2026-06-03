# GreenLean DPP Optimized Version

Optimized for the current Supabase database schema.

## Includes

- Public DPP page language dropdown: English / 中文
- Public DPP page modules: product overview, digital identity, BOM/components, materials, supply-chain traceability, ESG, certificates, circularity, consumer transparency, documents, data governance
- Backend product editor modules for the same data groups
- Product manager search, status filter, pagination, delete, bilingual fields
- Supabase patch: `supabase/optimization_patch.sql`

## Required Supabase step

Run this in Supabase SQL Editor before testing the optimized backend and public DPP page:

```text
supabase/optimization_patch.sql
```

It is safe to run multiple times.

## Local test

```bash
npm install
npm run dev
```

Test:

```text
http://localhost:3000/dashboard/products
http://localhost:3000/p/demo-organic-cotton-tshirt
```

## Deploy

```bash
git add .
git commit -m "Optimize GreenLean DPP system"
git push
```
