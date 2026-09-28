# V2 Backoffice Component Inventory

| Component | Purpose | Data/authorization source |
| --- | --- | --- |
| `BackofficeConsole` | Tenant selector, search, navigation, locale-aware operator shell | Auth session plus server-issued contexts |
| Operations dashboard | Live counts, readiness and recent activity | Tenant snapshot |
| Data table | Searchable, structured business rows and controlled status badges | Explicit safe field lists |
| Model workspace | Model identity plus parallel SKU, Batch and Item relationships | Product Core |
| Import workspace | CSV/JSON preview; Excel first-sheet normalization; non-writing preflight | Phase 5 import API |
| Mapping workspace | Profiles, versions and rule coverage | Phase 3 Mapping model |
| Review workspace | Candidate evidence and approve/request-changes/reject controls | Phase 4 review APIs and capabilities |
| Publication workspace | Immutable version state and Registry state | Phase 4 publication model |
| Audience policy | Access-policy inventory and server-filtering boundary | Schema Registry access policies |
| Integrations/Registry | Connector health, jobs and Registry status without credentials | Phase 5 safe operational metadata |
| Audit workspace | Publication, connector and PDP decision activity | Append-only audit sources |

The backend consists of two routes and one repository: the context route derives authority from identity relationships, the snapshot route invokes the V2 PDP, and the repository returns only explicitly selected operational fields. Existing domain write APIs remain the sole write boundary.
