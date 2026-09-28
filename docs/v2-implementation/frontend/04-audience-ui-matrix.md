# Audience UI Matrix

| Preview role | Server projection | Additional visible content | Publicly selectable |
|---|---|---|---|
| Public | `PUBLIC` | Public product, sustainability, compliance, circularity, documents and provenance | Yes |
| Repairer | `LEGITIMATE_INTEREST` | Repair, disassembly, service documents and lifecycle | Signed PreProd QA only |
| Recycler | `LEGITIMATE_INTEREST` | Materials, critical raw materials, disassembly and lifecycle | Signed PreProd QA only |
| Manufacturer | `INTERNAL` | Permitted operational fields, BMS and supply-chain data | Signed PreProd QA only |
| Authority | `AUTHORITY` | Permitted authority fields, due diligence and access policy | Signed PreProd QA only |

Authorization is enforced before rendering. CSS is not used as an access boundary.

Hosted verification established:

- public HTML contains no BMS snapshot or preview controls;
- unsigned `audience=MANUFACTURER` returns the Public projection;
- a grant for one role cannot be reused for another role, Passport or Production host;
- expired or overlong grants fail closed;
- no projection contains the false phrase “retained and verified” for `UNVERIFIED` data;
- Repairer/Recycler share the current `LEGITIMATE_INTEREST` data projection but retain distinct QA labels for future policy separation.
