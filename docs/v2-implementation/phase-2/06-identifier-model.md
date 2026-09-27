# 06 Identifier Model

## Subject and identifier types

Phase 2 supports subjects `FAMILY`, `MODEL`, `SKU`, `BATCH`, and `ITEM`. `PASSPORT` is reserved and rejected until a later phase. Enabled identifier types are `INTERNAL`, `MODEL_CODE`, `SKU`, `GTIN`, `BATCH_NUMBER`, `SERIAL_NUMBER`, and `UPI`; future `DPP_ID`, `REGISTRY_ID`, and `CREDENTIAL_ID` values are reserved but disabled.

## Normalization and validation

- GTIN display punctuation is removed and the 8/12/13/14-digit check digit is validated.
- UPI is trimmed and must be an HTTPS URL.
- Other identifiers are trimmed, whitespace-collapsed, and uppercased.
- A trigger validates that the subject exists in the same Tenant.

## Collision scope

- Active GTIN and UPI values are globally unique for the same type/scheme/issuer.
- Other active identifiers are unique within Tenant + type + scheme + issuer.
- Only one active primary identifier of a type may exist for a subject.
- Retiring an identifier clears `is_primary` and releases its active uniqueness slot.

