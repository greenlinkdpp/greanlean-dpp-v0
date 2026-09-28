# V2 Backoffice Information Architecture

Date: 2026-09-28  
Environment boundary: Hosted PreProd only

The V2 Operations Console is an authenticated, Tenant-scoped operator surface at `/dashboard/v2`. It does not replace or alter the public DPP experience. The console resolves the signed-in user's active Tenant membership or Partner authorization on the server and then loads a policy-checked snapshot for that Tenant.

## Navigation

| Group | Areas |
| --- | --- |
| Operate | Operations overview, Tenants & access, Organisations, Product families, Product models, SKUs, Batches, Individual items |
| Data | Data sources, Import workspace, Field mapping, Canonical claims, Data quality |
| Publish | Candidates, Review & approval, Publication, Passports & versions, Identifiers & resolver, Documents, Lifecycle |
| Govern | BMS & dynamic data, Audience policy, Integrations, Registry, Audit activity, Settings |

The Product hierarchy preserves Model → SKU and Model → Batch as parallel dimensions. Items can reference both dimensions. A dedicated Model page summarizes its SKUs, Batches and Items without implying that Batch is a child of SKU.

## Trust boundaries

- The browser discovers available contexts from `/api/v2/backoffice/context`; it cannot nominate an arbitrary Tenant.
- `/api/v2/backoffice/snapshot` re-evaluates the bearer token, Tenant authority, capability, feature gates and scope in the existing V2 PDP.
- All repository reads include `tenant_id`; global Schema and Connector definitions are fetched only by identifiers already referenced by Tenant-scoped rows.
- Connector secret references, connector configuration, candidate payloads and immutable publication payloads are excluded from the aggregate response.
- Every mutation continues through an existing V2 endpoint with an idempotency key and server-side capability check.

## Product experience

The console is desktop-first and remains usable on smaller screens through wrapping controls and horizontally scrollable navigation/tables. English and Chinese labels use the existing language context. Empty, loading, error and permission-disabled states are explicit. Synthetic PreProd is visibly labelled so the demo cannot be mistaken for verified customer data.
