# greanlean DPP Optimization Notes

This file is kept as a short implementation note. Use `README.md` as the current setup and deployment guide.

## Current Stable Baseline

- Public website with bilingual content and DPP demo showroom
- Public DPP pages with simple and detail views
- Four demo categories: textile, consumer electronics, WPC flooring and furniture
- Admin workspace with product center, supplier library and bulk import
- CSV / XLSX import templates aligned to the current DPP modules
- PDF / JSON export endpoint that reads live product data first and falls back to demo data
- Local-preview-first workflow before Vercel production deployment

## Next Productization Step

The next major architecture step should be company-level data isolation:

- `companies`
- user profiles and company memberships
- `company_id` on products and related DPP tables
- RLS policies scoped by company membership
- server-side admin write APIs for sensitive operations
