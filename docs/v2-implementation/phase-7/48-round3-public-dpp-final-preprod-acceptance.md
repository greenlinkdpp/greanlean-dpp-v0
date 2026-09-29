# Round 3 — Public DPP Final PreProd Acceptance

Date: 2026-09-29  
PreProd deployment: `dpl_At5hfxvkeq4cQsqLTdXBHE67AcYJ`  
Immutable URL: `https://greanlean-dpp-preprod-pssgn6gdt-songweinie-1175s-projects.vercel.app`  
Stable alias: `https://greanlean-dpp-preprod.vercel.app`  
Result: **PASS**

## Browser acceptance

- Public DPP desktop English: DPP-SOODOO-SYN-BP4815-000001 — official logo, DPP ID, PUBLISHED status, QR, warnings, public fields and no raw JSON primary UI.
- Public DPP desktop Chinese: DPP-SOODOO-SYN-BP4815-000002 — translated navigation/labels, invariant identifiers and warnings preserved.
- Public DPP mobile Chinese (390×844): no visible horizontal overflow; QR, product identity, warning banner and language/login navigation remain usable.
- A second Reference Model/Item (`...000003`) was checked through the Review workspace; candidate detail loaded only after the Tenant-scoped detail action.
- Backoffice English Review workspace: explicit SOODOO Tenant, candidate hash, validation/provenance summary, frozen field access/verification table and review actions.
- Backoffice Chinese Publication workspace: current publication, immutable version history, Resolver status, canonical public URL, QR and guarded withdraw action.

## Safety and regression

The public page uses `public/brand/greanlean-wordmark.png` with accessible `alt="GreanLean"`, PUBLIC audience projection, synthetic-demo warnings, and no source records, private evidence, restricted BMS, credentials, or internal audit data. Existing Resolver host allowlist and QR policy remain authoritative. Round 1/2 Tenant context and product/data workspace behavior remain unchanged.

Production was not deployed, written, switched, or observed/rewritten. Production File Import and Registry remain disabled.
