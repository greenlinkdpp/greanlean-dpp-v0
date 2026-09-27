# Phase 6 risk register

| ID | Risk | Severity | Evidence / impact | Mitigation | Accountable owner | Status | Accepted by |
|---|---|---|---|---|---|---|---|
| R-01 | No verified backup/PITR/restore | Critical | Irrecoverable loss/prolonged outage | Paid recovery capability and timed isolated drill | Database/Operations Owner — unassigned | OPEN | Not accepted |
| R-02 | No isolated Pre-Production | Critical | No safe rehearsal for migration/security/load/rollback | Provision fully separate environment | Infrastructure/Billing Owner — unassigned | OPEN | Not accepted |
| R-03 | Production V2 schema absent and ledger ends at 0026 | High | Pilot cannot use repository V2 | Approved migration plan after all gates | Database/Migration Owner — unassigned | OPEN | Not accepted |
| R-04 | Production RLS/grants runtime unverified | High | Possible cross-tenant access | Catalog audit and multi-identity negative tests | Security/Database Owner — unassigned | OPEN | Not accepted |
| R-05 | Unsupported/outdated Next 14.2.15 | High | Known/future web framework exposure | Upgrade to supported line and regression/security test | Application/Security Owner — unassigned | OPEN | Not accepted |
| R-06 | Missing CSP/nosniff/frame policy | High | Weaker XSS/clickjacking defenses | Add/test edge/application headers | Application/Security Owner — unassigned | OPEN | Not accepted |
| R-07 | Public Resolver rate/capacity unproven | High | Enumeration/DoS and Pilot outage | Edge limits/cache plus PreProd load test | Operations/Application Owner — unassigned | OPEN | Not accepted |
| R-08 | Legacy `products.sku` semantics unresolved | High | Incorrect Model/SKU mapping | Product/Data owner decision and versioned mapping | Product/Data Owner — unassigned | OPEN | Not accepted |
| R-09 | Existing QR/legacy URL compatibility unknown | High | Customer QR breakage/reprint | Inventory samples, logs, shadow compare, stable redirects | Product/Cutover Owner — unassigned | OPEN | Not accepted |
| R-10 | Monitoring/alert routing/on-call absent | High | Late incident detection and unsafe Pilot | Implement dashboards, alerts, owners, thresholds | Operations Owner — unassigned | OPEN | Not accepted |
| R-11 | Arbitrary legacy QR URL | Medium | Phishing/brand abuse | Allowlist Resolver origin or deprecate | Application/Security Owner — unassigned | OPEN | Not accepted |
| R-12 | Free/public Storage policy limitations unverified | High | Unbounded upload/type or disclosure risk | Policy/catalog audit, limits, signed URL tests | Storage/Security Owner — unassigned | OPEN | Not accepted |

No risk is assigned to Codex and no Critical/High risk is self-accepted.
