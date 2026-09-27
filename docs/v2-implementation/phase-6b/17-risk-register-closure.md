# Phase 6B Final Risk Register

| Risk | Severity | Final classification | Evidence / required action |
|---|---|---|---|
| R-01: no verified backup/PITR/restore | Critical | CLOSED | Pro managed backups verified; isolated database restore PASS; PITR not required for invited Pilot |
| R-02: no isolated PreProd | Critical | CLOSED | Isolated PreProd exists at `0033` |
| R-03: Production V2 schema absent | High | DEFERRED_TO_PHASE7 | Expected by safety constraint; no Production migration authorised |
| R-04: Production RLS runtime assurance | High | CLOSED for Phase 6B | Production anonymous sample plus isolated PreProd multi-identity verification passed; stated Production identity limitation retained |
| R-05: unsupported framework | High | CLOSED | Supported framework upgrade and regression/audit evidence passed |
| R-06: missing browser security headers | High | CLOSED | Header and CSP tests passed |
| R-07: public Resolver rate/capacity | High | BLOCKING | Process-local limiter only; hosted path absent; p95 6.13 s; Pilot scope/SLO undefined |
| R-08: legacy SKU semantics | High | BLOCKING | Five rows remain quarantined; business owner must map or explicitly exclude them |
| R-09: QR/legacy compatibility | High | CLOSED for tested paths | V1 and V2 shadow compatibility tests passed; separate R-11 policy remains |
| R-10: monitoring/on-call | High | BLOCKING | External routing, retention, backup-freshness alert delivery, and accountable owner are absent |
| R-11: arbitrary legacy QR URL | Medium | BLOCKING | Requires explicit deprecation or strict destination allowlist decision |
| R-12: Storage policy/recovery boundary | High | CLOSED for Phase 6B evidence | Policy tests passed; database restore boundary explicitly excludes Storage binary objects |

```text
UNACCEPTED_CRITICAL_RISK = 0
UNACCEPTED_HIGH_RISK = 3
```

R-03 is an explicitly sequenced Phase 7 activity rather than an accepted residual Production risk; it cannot be executed under the current instruction. R-07, R-08, and R-10 remain unaccepted High blockers. R-11 is a Medium blocker and is also retained in the final decision.
