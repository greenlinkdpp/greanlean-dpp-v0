# Publication version model

`dpp_version` stores monotonically increasing numbers per Passport, a UUID Schema Version, Review Task, Candidate Hash, canonical payload and canonical text, Payload Hash, canonicalization version, separate workflow/publication/registry states, publication metadata and a supersedes link.

The database RPC `v2_publish_approved_review` locks the Review and Passport, verifies approval and hashes, assigns the next number, supersedes the previous current Version, inserts the immutable Version, updates the current pointer and appends audit events in one transaction.

Repeated publication of the same Review returns its existing Version. HTTP idempotency additionally binds actor, path, key and request hash; a reused key with a different body conflicts.

Withdrawal removes only the current pointer, marks the Version `WITHDRAWN`, stores a safe reason category and retains history.

