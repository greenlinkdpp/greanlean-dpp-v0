# V2 Presentation Metadata Contract

Presentation metadata is separate from immutable business values.

```ts
type PresentationMetadata = {
  section: string;
  label: { en: string; zh: string };
  renderType:
    | "identity" | "specifications" | "carbon" | "composition"
    | "compliance" | "repair" | "disassembly" | "circularity"
    | "documents" | "timeline" | "bms" | "provenance" | "key-value";
  order: number;
  mobilePriority: "high" | "standard" | "low";
  emptyBehavior: "hide" | "state";
};
```

The complete normalized input preserves:

- field code and value;
- unit and verification state;
- audience-filtered provenance;
- published version identity and timestamps;
- explicit business states such as `UNKNOWN`, `NOT_APPLICABLE`, `REDACTED` and `NOT_AUTHORIZED`.

Field codes never appear as the normal public label. English and Simplified Chinese labels are selected independently from field keys. Unit suffixes are derived only for known suffixes; canonical values are not converted or rewritten.

Unknown fields follow this fallback:

```text
scalar → formatted key/value
list → readable list
object → nested key/value group
unknown complex field → collapsed Technical Details section
```

Current configuration covers identity, technical specification, durability, BMS, carbon footprint, recycled content, materials, compliance, repair, disassembly, end-of-life, warranty, documents, lifecycle, provenance, due diligence, access policy and manufacturing/supply-chain fields.
