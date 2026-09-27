# Review workflow

Submission resolves the current Phase 3 Candidate and freezes its Tenant, subject, Schema Version, Candidate Hash, resolution algorithm, validation summary, generation time and enriched immutable payload. Blocking validation prevents submission.

States are `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED`, `CANCELLED`, and `PUBLISHED`. A database trigger makes Candidate identity and payload fields immutable and restricts transitions.

Capabilities are separated:

- Author: `dpp.submit_review`
- Reviewer: `dpp.review`, `dpp.approve`, `dpp.reject`
- Publisher: `dpp.publish`
- Withdrawal: `dpp.withdraw`

An author cannot approve the same Review. Before publication the service resolves the Candidate again and compares its hash with the approval. A changed Claim produces a new Candidate Hash and causes `REVIEW_APPROVAL_STALE`.

