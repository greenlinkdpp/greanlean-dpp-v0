# EU DPP harmonised standards conformance baseline

Status date: 2026-09-17  
Baseline: Commission Implementing Decision (EU) 2026/1736

This is an engineering readiness assessment, not a declaration of conformity. The repository records implementation evidence and open work, but none of the six standards is marked verified until the licensed normative text has been reviewed and objective conformance evidence has been approved.

| Standard | Scope | Current status | Existing evidence | Required closure evidence |
|---|---|---|---|---|
| EN 18216:2026 | Data exchange protocols | Partial | Canonical JSON and export endpoints | Protocol test suite, content negotiation and error-contract evidence |
| EN 18219:2026 | Unique identifiers | Partial | HTTPS UPI, GS1 parsing and item uniqueness constraints | Identifier governance, persistence and resolver continuity tests |
| EN 18220:2026 | Data carriers | Partial | QR generation and Digital Link support | Placement procedure, print quality, durability and fallback tests |
| EN 18221:2026 | Storage, archiving and persistence | Partial | Immutable publications, hashes and deployment backup gate | Retention schedule, restore drill, RTO/RPO and provider-exit evidence |
| EN 18222:2026 | Lifecycle and search APIs | Partial | DPP access/export APIs and structured API errors | Formal API conformance, versioning, pagination, throttling and availability contract |
| EN 18223:2026 | System interoperability | Partial | Schema registry, canonical projection and access projection | Cross-provider test and official semantic-repository alignment |

The machine-readable source of this matrix is `config/dpp/eu-dpp-harmonised-standards-v2026.1.json`. Status changes must include the normative clause reference, test or review evidence, approver and date. A status must not move to `verified` merely because a similarly named feature exists in the platform.

## Release rule

- Product releases may state that the platform is preparing against the six standards.
- They may not state that Greanlean conforms to a standard while any gap for that standard remains open.
- Battery DPP publication readiness and formal standards conformity remain separate decisions.
- Existing published DPP snapshots are not rewritten when this assessment changes.
