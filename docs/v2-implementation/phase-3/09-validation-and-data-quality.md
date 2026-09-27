# Validation and Data Quality

Candidate validation aggregates field applicability, resolution conflicts and required-value state. A required missing, `UNKNOWN`, or `CLEAR` result creates `REQUIRED_VALUE_UNKNOWN` with blocking severity. Conflicts are also blocking.

Data-quality output reports completeness, Provenance coverage, verification coverage, mapping errors, resolution conflicts and blocking-issue count. Counts are diagnostic facts rather than a compliance score.

The synthetic Item candidate intentionally remains `BLOCKING`: rated capacity has a SKU/Batch conflict and serial number is required but unknown. This proves that candidate generation can succeed without falsely declaring publication readiness.

Verification status remains independent of resolution and completeness. `UNVERIFIED` is the default for imported and manually entered values.
