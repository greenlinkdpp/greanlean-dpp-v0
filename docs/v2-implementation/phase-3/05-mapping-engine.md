# Mapping Engine

Mapping Profile binds a Data Source to one Schema Definition. Mapping Version is content-hashed and transitions from `DRAFT` to immutable `ACTIVE`, with replacement by a new version rather than overwrite. Mapping Rules map JSON pointers to Field Definitions and record transform type, unit, null policy and lossiness.

Dry Run is side-effect free and deterministic. It reports fields, warnings, errors, unmapped top-level inputs, input hash and output hash. Commit requires an active version, rejects errors, and requires explicit acceptance of warnings.

Built-in replayable transforms include trim, case normalization, number/date parsing, enum/reference mapping, split/join and same-dimension unit conversion. The current unit table covers mAh/Ah, Wh/kWh and g/kg with an explicit conversion version.

Unknown, null, lossy and unmapped values are surfaced; they are never silently dropped. Live verification also confirmed that database `target_field_definition_id` is explicitly adapted to the engine's `field_definition_id` contract.
