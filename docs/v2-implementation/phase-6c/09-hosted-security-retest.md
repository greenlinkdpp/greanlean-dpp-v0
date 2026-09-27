# Hosted Security Retest

| Test | Hosted result |
|---|---|
| Cross-tenant request | Own tenant 200; forged tenant 403 |
| IDOR | Tenant boundary enforced |
| Resolver enumeration | Unknown identifier 404 with generic `RESOLVER_NOT_FOUND`; no backend detail |
| Rate-limit bypass | Distributed atomic backend; QR ceiling returns 429 + `Retry-After` |
| Spoofed forwarded IP | Did not alter trusted identity |
| Oversized declared body | 413 |
| Chunked oversized body | 413 |
| Open redirect / arbitrary QR | External and unsafe targets rejected 400 |
| SSRF/connector surface | Unauthenticated probe denied |
| Published payload mutation | API mutation failed closed; anonymous direct database PATCH changed zero rows under RLS |
| HTTPS and headers | PASS |

Automated unit, integration, migration, type and build verification also cover the new controls. No Critical or High technical vulnerability was found in this retest. The separate unaccepted High risks are capacity/SLO and unassigned operations, so Phase completion remains blocked.

```text
HOSTED_SECURITY_RETEST = PASS
SECURITY_GATE = PASS
```
