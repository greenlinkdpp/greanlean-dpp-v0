# Product Data Workflow

1. Select an authorised Tenant; SOODOO E-bike is preferred only when it is present in the server-issued context list.
2. Establish Organisation and Product Family identity through the existing V2 domain APIs.
3. Create a Product Model, then define SKU and Batch dimensions independently.
4. Create Items with the approved Model/SKU/Batch relationship constraints.
5. Register identifiers and resolver mappings without using identifiers as internal primary keys.
6. Attach Data Sources and Source Records. Raw observations stay distinct from Canonical Claims.
7. Resolve Claim inheritance/override/clear/not-applicable states and inspect validation outcomes.
8. Create a Passport, generate/submit a Candidate, review it, and publish only an approved, non-stale Candidate.

All operator writes require an appropriate server capability and an idempotency key. Cross-Tenant references are rejected by the existing composite foreign keys and V2 policy boundary. No Product, Passport, Claim or publication data is written merely by opening the console.
