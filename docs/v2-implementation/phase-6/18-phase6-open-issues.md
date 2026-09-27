# Phase 6 open issues

1. Assign accountable humans for Backup, Restore, Database, Security, Migration, Cutover, Rollback, Monitoring, Registry, and Customer Communication.
2. Provision a third, fully isolated paid Pre-Production environment and dedicated Vercel environment.
3. Enable/verify Production backup/PITR and Storage backup; complete a timed isolated restore.
4. Confirm the Production deployed commit SHA and deployment identifier.
5. Export/verify Production catalog details for columns, keys, indexes, functions, triggers, grants, RLS policies, SECURITY DEFINER, and search paths.
6. Upgrade Next.js from 14.2.15 to a supported release line and close relevant advisories.
7. Add CSP, `X-Content-Type-Options`, frame protection, Referrer-Policy, and Permissions-Policy; verify at all public domains.
8. Decide whether public signup is intentional; Production currently reports signup enabled and email auto-confirm disabled.
9. Resolve the semantic meaning of all five legacy `products.sku` values and version the mapping decision.
10. Complete full migration reconciliation for tenants, organisations, hierarchy, identifiers, schemas, claims, passports, publications, aliases, and URLs.
11. Run Pre-Production shadow compare with zero critical unknown differences.
12. Run the complete performance matrix with approved SLO/capacity thresholds and resource metrics.
13. Complete failure injection, live kill-switch, and timed rollback drills.
14. Inventory Production QR samples and V1/API usage telemetry; prove no required reprint.
15. Restrict or retire the arbitrary legacy QR URL generator.
16. Configure Production-grade monitoring, alert destinations, on-call coverage, and backup freshness checks.
17. Approve RPO/RTO, retention, residency, support window, and Pilot selection.
Closed: the historical Phase 5 seed-trigger defect is fixed by migration `0032`, replayed successfully in Development, and covered by reversible contract tests. The Phase 5 live verifier also passed on a clean rerun after the earlier transient development-server 404.
