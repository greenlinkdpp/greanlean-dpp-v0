# Backoffice Permission Matrix

| Area/action | Read capability | Write/decision capability |
| --- | --- | --- |
| Tenant dashboard and Product Master | `tenant.view`, `product.view` | `product.edit` |
| Membership and access | `tenant.view` | `tenant.manage_members`, partner approval/revoke capabilities |
| Sources, mappings and Claims | Schema/Canonical view capabilities | Source, mapping and Claim management capabilities |
| Import | `connector.view` | `import.create`; explicit commit requires `import.commit` |
| Passport | `dpp.view` | `dpp.create` / Passport edit capability |
| Candidate/Review | `dpp.review` | `dpp.submit_review`, `dpp.approve`, `dpp.request_changes`, `dpp.reject` |
| Publication | `dpp.view` | `dpp.publish`; withdrawal uses its dedicated capability |
| Identifier/Resolver | Product/DPP view | `identifier.manage` |
| Integrations | `connector.view` | `connector.manage`, `connector.execute` |
| Registry | Connector/DPP view | `registry.submit` |
| Audit | Tenant-authorised operational view | Append-only, produced by server operations |

The UI consumes capability codes only to explain or disable actions. The backend remains authoritative and re-evaluates identity, active time window, Tenant, capability, scope, feature gates and resource identifiers on every request. Partner authority is bounded by its Permission Profile and Scope Grant; platform status alone does not imply Tenant data access.
