export type LegacyFieldSource =
  | "products_fixed_columns"
  | "product_sector_field_values"
  | "battery_field_value"
  | "dpp_field_templates";

export function classifyLegacyFieldSource(source: string) {
  switch (source as LegacyFieldSource) {
    case "products_fixed_columns":
    case "product_sector_field_values":
    case "battery_field_value":
      return { status: "SOURCE_RECORD_CANDIDATE", sourceType: "LEGACY", sourceDisclosure: "LEGACY_SOURCE_UNKNOWN" } as const;
    case "dpp_field_templates":
      return { status: "FIELD_MAPPING_CANDIDATE", sourceType: "LEGACY", sourceDisclosure: "LEGACY_SOURCE_UNKNOWN" } as const;
    default:
      return { status: "REJECTED", sourceType: null, sourceDisclosure: null } as const;
  }
}
