# Phase 6C Risk Closure

| Risk | Phase 6B state | Phase 6C state | Disposition |
|---|---|---|---|
| `R-07` Resolver capacity and hosted enforcement | High / unaccepted | High / unaccepted | Enforcement is closed, but accepted SLO and burst safety margin remain open |
| `R-08` Five legacy-row semantics | High / unaccepted | Closed for Pilot | All five explicitly excluded; no guessing or V1 change |
| `R-10` External monitoring/on-call ownership | High / unaccepted | High / unaccepted | Roles/alerts defined; named owners, channels, and acknowledgment absent |
| `R-11` Arbitrary-target QR | Medium / blocking | Closed | Capability deprecated; strict official-target validation deployed in Hosted PreProd |

```text
UNACCEPTED_CRITICAL_RISK = 0
UNACCEPTED_HIGH_RISK = 2
```

Inherited backup/restore evidence remains valid. Production V2 migration is prohibited and sequenced after a future explicit authorisation; it is not silently accepted here.
