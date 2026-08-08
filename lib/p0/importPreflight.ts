import { createHash } from "node:crypto";
import { validateBatteryTechnicalValues } from "./applicability.ts";

export type P0ImportType = "BATTERY_ITEMS" | "BOM" | "FIELD_VALUES";

export type P0ImportError = {
  rowNumber: number;
  columnName: string | null;
  fieldKey: string | null;
  code: string;
  message: string;
  rawValue: string | null;
  severity: "WARNING" | "ERROR" | "BLOCKER";
  suggestedFix: string | null;
};

function value(row: Record<string, unknown>, key: string) {
  return row[key] === null || row[key] === undefined ? "" : String(row[key]).trim();
}

function numeric(row: Record<string, unknown>, key: string) {
  const raw = value(row, key);
  return raw === "" ? null : Number(raw);
}

export function normalizeP0ImportRows(type: P0ImportType, rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    if (type === "BATTERY_ITEMS") {
      return {
        serialNumber: row.serialNumber ?? row.serial_number,
        itemCode: row.itemCode ?? row.item_code,
        upi: row.upi,
        publicKey: row.publicKey ?? row.public_key,
        manufacturedAt: row.manufacturedAt ?? row.manufactured_at,
        sourceSystem: row.sourceSystem ?? row.source_system,
        demoMarker: row.demoMarker ?? row.demo_marker,
      };
    }
    if (type === "BOM") {
      return {
        componentName: row.componentName ?? row.component_name,
        componentNameZh: row.componentNameZh ?? row.component_name_zh,
        componentType: row.componentType ?? row.component_type,
        componentTypeZh: row.componentTypeZh ?? row.component_type_zh,
        materialName: row.materialName ?? row.material_name ?? row.componentName ?? row.component_name,
        materialNameZh: row.materialNameZh ?? row.material_name_zh,
        materialType: row.materialType ?? row.material_type ?? row.componentType ?? row.component_type,
        quantity: row.quantity ?? row.mass_kg ?? 1,
        unit: row.unit ?? (row.mass_kg !== undefined ? "kg" : "item"),
        position: row.position,
        percentage: row.percentage ?? row.mass_percentage,
        recycledContent: row.recycledContent ?? row.recycled_content,
        originCountry: row.originCountry ?? row.origin_country,
        chemicalInformation: row.chemicalInformation ?? row.chemical_information,
        recyclability: row.recyclability,
        certification: row.certification,
      };
    }
    return {
      fieldKey: row.fieldKey ?? row.field_key,
      value: row.value,
      nominalVoltageV: row.nominalVoltageV ?? row.nominal_voltage_v,
      ratedCapacityAh: row.ratedCapacityAh ?? row.rated_capacity_ah,
      ratedEnergyKwh: row.ratedEnergyKwh ?? row.rated_energy_kwh,
    };
  });
}

function issue(
  rowNumber: number,
  columnName: string | null,
  code: string,
  message: string,
  rawValue: unknown,
  suggestedFix: string,
): P0ImportError {
  return {
    rowNumber,
    columnName,
    fieldKey: columnName,
    code,
    message,
    rawValue: rawValue === null || rawValue === undefined ? null : String(rawValue),
    severity: "BLOCKER",
    suggestedFix,
  };
}

export function preflightP0Import(type: P0ImportType, rows: Array<Record<string, unknown>>) {
  const errors: P0ImportError[] = [];
  const serials = new Map<string, number>();
  const normalizedRows = normalizeP0ImportRows(type, rows);

  normalizedRows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (type === "BATTERY_ITEMS") {
      const serial = value(row, "serialNumber").toUpperCase();
      if (!serial) {
        errors.push(issue(rowNumber, "serialNumber", "SERIAL_REQUIRED", "A serial number is required.", row.serialNumber, "Provide a unique serial number."));
      } else if (serials.has(serial)) {
        errors.push(issue(rowNumber, "serialNumber", "DUPLICATE_SERIAL_IN_FILE", `Serial number duplicates row ${serials.get(serial)}.`, row.serialNumber, "Use one unique serial number per row."));
      } else {
        serials.set(serial, rowNumber);
      }
      const upi = value(row, "upi");
      if (upi && !/^https:\/\/[^\s]+$/i.test(upi)) {
        errors.push(issue(rowNumber, "upi", "ID-001", "UPI must be an absolute HTTPS URL.", upi, "Use an https:// URL or leave it empty for server generation."));
      }
    }

    if (type === "BOM") {
      if (!value(row, "componentName")) {
        errors.push(issue(rowNumber, "componentName", "COMPONENT_NAME_REQUIRED", "A component name is required.", row.componentName, "Provide the component name."));
      }
      if (!value(row, "materialName")) {
        errors.push(issue(rowNumber, "materialName", "MATERIAL_NAME_REQUIRED", "A material name is required.", row.materialName, "Provide the material name."));
      }
      const percentage = numeric(row, "percentage");
      if (percentage !== null && (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) {
        errors.push(issue(rowNumber, "percentage", "MAT-001", "Material percentage must be between 0 and 100.", row.percentage, "Provide a numeric percentage from 0 to 100."));
      }
      const quantity = numeric(row, "quantity");
      if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
        errors.push(issue(rowNumber, "quantity", "BOM_QUANTITY_INVALID", "Component quantity must be a positive number.", row.quantity, "Provide a positive numeric quantity."));
      }
    }

    if (type === "FIELD_VALUES") {
      if (!value(row, "fieldKey")) {
        errors.push(issue(rowNumber, "fieldKey", "FIELD_KEY_REQUIRED", "A field key is required.", row.fieldKey, "Provide a field key from the selected schema version."));
      }
      if (row.value === null || row.value === undefined || value(row, "value") === "") {
        errors.push(issue(rowNumber, "value", "FIELD_VALUE_REQUIRED", "A field value is required.", row.value, "Provide the declared or measured value."));
      }
      const technicalErrors = validateBatteryTechnicalValues({
        nominalVoltageV: numeric(row, "nominalVoltageV"),
        ratedCapacityAh: numeric(row, "ratedCapacityAh"),
        ratedEnergyKwh: numeric(row, "ratedEnergyKwh"),
      });
      for (const technicalError of technicalErrors) {
        errors.push(issue(rowNumber, null, technicalError.code, technicalError.message, null, "Correct the related technical values before import."));
      }
    }
  });

  if (type === "BOM") {
    const percentages = normalizedRows.map((row) => numeric(row, "percentage")).filter((item): item is number => item !== null && Number.isFinite(item));
    const totalError = validateBatteryTechnicalValues({ componentPercentages: percentages }).find((item) => item.code === "MAT-001");
    if (totalError) errors.push(issue(1, "percentage", totalError.code, totalError.message, percentages.reduce((sum, item) => sum + item, 0), "Adjust the BOM percentages so the total does not exceed 100%."));
  }

  const canonicalInput = JSON.stringify({ type, rows: normalizedRows });
  const inputHash = createHash("sha256").update(canonicalInput).digest("hex");
  const invalidRows = new Set(errors.filter((item) => item.severity !== "WARNING").map((item) => item.rowNumber).filter((row) => row > 1));
  return {
    inputHash,
    templateVersion: `${type.toLowerCase().replaceAll("_", "-")}-p0-1.0`,
    totalRows: rows.length,
    successfulRows: Math.max(0, rows.length - invalidRows.size),
    warningRows: 0,
    failedRows: invalidRows.size,
    canCommit: errors.every((item) => item.severity === "WARNING"),
    errors,
  };
}
