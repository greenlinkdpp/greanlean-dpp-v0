# Registry TEST Adapter

The TEST adapter implements `prepare`, `validate`, `submit`, `getStatus`, `receiveCallback`, `cancel` and `mapExternalIdentifier`. Adapter version is `registry-test-v1`.

A submission is accepted only from an immutable Phase 4 DPP Version whose publication state is `PUBLISHED`. The job snapshot fixes version ID, version number, candidate hash, payload hash, schema/profile and Registry profile. Draft/candidate data is rejected with `REGISTRY_VERSION_NOT_PUBLISHED`.

TEST fixture modes cover accepted, rejected, pending, failed, timeout and duplicate behavior. Accepted submissions create an issuer/scheme-qualified external identifier mapping and an immutable receipt. Registry state remains separate from Resolver/publication state: rejection or outage cannot alter the current published pointer or public DPP.

Final Development evidence produced Registry states `ACCEPTED`, `REJECTED`, `ACCEPTED`, including duplicate/idempotent behavior, polling and failure isolation.
