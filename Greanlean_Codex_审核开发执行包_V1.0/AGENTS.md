# Greanlean repository instructions for Codex

## Required reading order
1. `README_CODEX.md`
2. `CODEX_MASTER_TASK.md`
3. `docs/00_INDEX.md`
4. `docs/01_PRODUCT_REQUIREMENTS.md`
5. `docs/02_REGULATORY_GUARDRAILS.md`

The Word file under `reference/` is the signed-off product requirement baseline. The Markdown files are the execution form of that baseline.

## Operating rules
- Inspect the existing repository before choosing architecture, frameworks, naming, storage, authentication, API style, or deployment approach. Existing working conventions take precedence unless they conflict with security, data integrity, or an explicit requirement.
- Execute in this order: repository audit -> gap analysis -> technical design -> migration plan -> implementation -> tests -> review -> release report.
- During the audit phase, do not modify application code, schema, infrastructure, lockfiles, dependencies, or generated assets. Audit documents may be created only under `docs/generated/`.
- Do not silently invent legal or regulatory requirements. Mark uncertain items as `待确认`, document them in `docs/generated/DECISIONS_REQUIRED.md`, and keep implementation configurable.
- Do not claim Registry registration success without an official returned URI and retained response record.
- A published battery passport is item-level by default. `ProductModel` and optional `Batch` provide inherited data; `BatteryItem` owns the unique serial number and resolvable HTTPS UPI.
- Published passport versions are immutable. Corrections create a new draft/version with reason, actor, timestamp, and diff.
- Authorization must be enforced server-side for page, API, export, and file download. Front-end hiding is not authorization.
- Preserve existing public URLs and data whenever technically feasible. Breaking changes require a compatibility or migration plan.
- Database migrations must be reversible or have a documented restore path. Back up or snapshot before destructive operations.
- Registry production integration must be behind a feature flag until official interface, semantic catalog, credentials, and test evidence are available.
- Every implementation task must include tests and update `docs/generated/TRACEABILITY_STATUS.md`.
- Run the repository's existing formatting, linting, type-checking, unit, integration, and build commands. Discover commands from the repository; do not guess them.
- Do not expose secrets, production data, personal information, or customer evidence in logs, fixtures, screenshots, commits, or generated documents.

## Stop conditions
Stop implementation and request a decision only when at least one condition applies:
- a destructive migration cannot be made safe;
- authentication/tenant isolation is unknown and cannot be inferred;
- the requested behavior conflicts with existing customer data or public URL compatibility;
- a legal or Registry behavior would need to be invented;
- tests/build cannot run and the cause cannot be isolated without risky changes.

For non-critical ambiguity, choose the least invasive option consistent with current repository conventions, document the assumption, and continue.
