# Field Definition and Rules

`field_definition` adds semantic name/URI, vocabulary reference, cardinality, allowed subject levels, verification requirement, display metadata, deprecation link, and resolution policy. Existing `data_type`, unit, access class, requirement status, Validation Rule and Applicability Rule remain authoritative.

Allowed subject levels are `FAMILY`, `MODEL`, `SKU`, `BATCH`, and `ITEM`. Resolution policies are `MODEL_ONLY`, `SKU_PREFERRED`, `BATCH_PREFERRED`, `ITEM_PREFERRED`, `MOST_SPECIFIC`, and `NO_AMBIGUITY_ALLOWED`.

The live fixture covers manufacturer name, rated capacity, manufacturing date, serial number and carbon footprint. It exercises public/internal access, required/voluntary requirements, unit-bearing and unitless values, and conflicting SKU/Batch claims.

Published Field rows reject update/delete. Draft Tenant fields remain editable through the controlled Schema API.
