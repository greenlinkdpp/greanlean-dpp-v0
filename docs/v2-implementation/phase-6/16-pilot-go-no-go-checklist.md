# Pilot go/no-go checklist

Decision: **NO-GO / NOT_READY**.

| Gate | Evidence required | Result |
|---|---|---|
| GATE-A Production Evidence | identity, deployed SHA, schema, RLS, Storage, secrets | FAIL |
| GATE-B Backup / Restore | backup/PITR and timed isolated restore | BLOCKED |
| GATE-C Security | no unaccepted Critical/High, runtime negative tests | FAIL |
| GATE-D Data Migration | full deterministic dry run and reconciliation | BLOCKED |
| GATE-E Compatibility | shadow compare, URL/QR/API inventory | BLOCKED |
| GATE-F Performance | approved PreProd load matrix | BLOCKED |
| GATE-G Rollback | failure injection and timed rollback | BLOCKED |
| GATE-H Observability | live metrics, alerts, on-call routing | BLOCKED |
| GATE-I Pilot Runbook | written runbook and checklist | PASS |

Additional required confirmations: owner availability, support window, Pilot choice, RPO/RTO acceptance, retention/residency decisions, and external dependency freeze are all unresolved.

Go is allowed only when A–I are PASS and every Critical/High residual risk is either remediated or accepted in writing by the accountable business/security owner. Codex/Developer cannot accept those risks.
