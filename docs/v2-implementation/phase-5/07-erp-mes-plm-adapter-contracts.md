# ERP, MES and PLM Adapter Contracts

The contracts are deliberately narrow and versionable:

| Adapter | Required semantic surface |
|---|---|
| ERP | product, material, external identifiers, update time and cursor |
| MES | model, batch, item, production event, manufacturing date, serial and inspection reference |
| PLM | product model, BOM reference, properties, document reference, revision and effective date |

Each adapter implements incremental fetch semantics with a cursor/watermark and produces external records for the shared Mapping engine. Adapter payloads do not directly edit published DPP content.

The Development workflow committed synthetic records for all three adapter types into Canonical Claims with source-record and Data Source provenance. The job snapshot pins adapter code/version and Mapping Version so later adapter or schema changes cannot reinterpret historical work silently.
