# Phase 4 test matrix

| Area | Evidence | Result |
|---|---|---|
| Passport identity + DPP_ID | live verifier + migration tests | PASS |
| Candidate-bound review and stale approval | live two-candidate workflow | PASS |
| Separation of duties | Author/Reviewer/Publisher/Read-only negative paths | PASS |
| Version immutability/delete protection | direct DB mutation tests | PASS |
| Atomic publish/idempotency/supersede | live versions 1 and 2 | PASS |
| Current pointer constraints | live pointer + cross-Passport rejection | PASS |
| Resolver inputs | DPP ID, GTIN, UPI, legacy ID, slug, alias, old URL | PASS |
| Resolver safety | allowlist, ambiguity/cycle/expiry contracts, Tenant FKs | PASS |
| Audience projection | four audience unit tests + anonymous deny | PASS |
| JSON/HTML/JSON-LD/PDF/QR consistency | live headers and content | PASS |
| Withdraw/tombstone/history | live withdrawal workflow | PASS |
| Migration round trip | 0030 UP → DOWN → 0029 regression → UP | PASS |
| Local tests | 181 unit/integration + 44 migration | PASS |
| Build gates | hygiene, TypeScript, Next production build | PASS |

