# Resolution Engine

Resolution walks the Product hierarchy `FAMILY → MODEL → SKU/BATCH → ITEM`. Item overrides first; SKU and Batch are parallel branches, not an invented parent-child order. Model and Family values provide fallback when more specific subjects inherit or have no effective Claim.

Different active SKU and Batch overrides produce `RESOLUTION_CONFLICT` unless the Field carries an explicit preference. Equal values resolve with an equivalence warning. The live fixture confirms an unresolved rated-capacity conflict and a carbon-footprint conflict resolved by `BATCH_PREFERRED`.

Superseded and out-of-window Claims are excluded. Output retains value, unit, origin level/subject, Schema Version, Claim, Provenance, verification, effective interval, evidence and warnings.

The resolved artifact is `RESOLVED_PRODUCT_CANDIDATE`. Its hash excludes generation time and is stable for the same semantic inputs. It is explicitly not a Published DPP.
