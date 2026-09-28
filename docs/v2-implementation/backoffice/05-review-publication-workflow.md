# Review and Publication Workflow

Candidate, Review, Publication and Registry are separate states in the console.

- Candidate generation resolves Product scope and Canonical Claims against a specific Schema Version and records a candidate hash.
- Submission creates an `IN_REVIEW` task. Validation summary and immutable hash are visible to the operator.
- Approve, request changes and reject are capability-specific server actions. Disabled controls communicate missing capability but do not substitute for server authorization.
- Publication accepts only an approved Review and reuses the existing stale-candidate/hash checks. It creates an immutable version and updates the current pointer atomically.
- Withdrawal and Registry submission remain distinct downstream actions. Registry status never changes DPP publication truth.

The synthetic SOODOO dataset exercises three Item passports and three immutable versions. All customer-verification language remains bounded: synthetic or self-declared evidence is not presented as independently verified.
