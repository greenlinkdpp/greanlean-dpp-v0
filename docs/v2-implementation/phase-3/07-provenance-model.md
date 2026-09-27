# Provenance Model

Every committed or manually entered Claim receives a Provenance Record. It identifies the Tenant, subject, Field Definition, source/actor, raw and normalized references, Mapping Version, Transformation Result, timestamps, verification status, evidence references and disclosure state.

Database constraints require a known Data Source, entering actor, or explicit `LEGACY_SOURCE_UNKNOWN`. Claim and Provenance subject/field relationships must match. Mapping provenance retains original value/unit, normalized value/unit and conversion version so normalization can be replayed.

Default verification is `UNVERIFIED`; ingestion does not imply truth. Evidence references are metadata only and never grant access to evidence files. The existing evidence authorization boundary remains unchanged.

Live candidate verification reported 100% provenance coverage for resolved fixture fields.
