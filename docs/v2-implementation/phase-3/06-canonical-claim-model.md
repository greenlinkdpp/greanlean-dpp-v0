# Canonical Claim Model

Canonical Claim is the append-oriented value assertion for one Tenant, product subject, Field Definition and Schema Version. Resolution states are `INHERIT`, `OVERRIDE`, `CLEAR`, `NOT_APPLICABLE`, and `UNKNOWN`.

`OVERRIDE` requires a value; other states require no value. `NOT_APPLICABLE` requires a reason. Subject existence, Tenant consistency, Schema/Field consistency and allowed subject levels are database-enforced.

Corrections create a new Claim with `supersedes_claim_id`. The old Claim remains queryable and the resolution engine excludes it from the effective set. The Development test confirms that the successor resolves while history remains intact.

Claim creation is capability-gated and idempotent at the API boundary. This model does not create, approve, publish, or point to a DPP version.
