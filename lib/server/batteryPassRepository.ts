import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import evSchema from "../../config/battery/schemas/EV.json";
import industrialWithoutBmsSchema from "../../config/battery/schemas/Industrial_Without_BMS.json";
import lmtSchema from "../../config/battery/schemas/LMT.json";
import otherIndustrialSchema from "../../config/battery/schemas/Other_Industrial_Above_2kWh.json";
import stationaryIndustrialSchema from "../../config/battery/schemas/Stationary_Industrial_Above_2kWh.json";
import { buildBatteryPassPayload } from "../battery/batteryPass.ts";
import type { BatterySchemaCode } from "../battery/catalog.ts";
import { ApiError } from "./apiRoute";
import { loadBatteryWorkspace } from "./batteryRepository";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const schemaByCode: Partial<Record<BatterySchemaCode, {
  filename: string;
  schema: Record<string, any>;
}>> = {
  "battery.ev": { filename: "ev", schema: evSchema },
  "battery.lmt": { filename: "lmt", schema: lmtSchema },
  "battery.industrial.without_bms": {
    filename: "industrial-without-bms",
    schema: industrialWithoutBmsSchema,
  },
  "battery.industrial.non_stationary": {
    filename: "industrial-other-above-2kwh",
    schema: otherIndustrialSchema,
  },
  "battery.industrial.stationary": {
    filename: "industrial-stationary-above-2kwh",
    schema: stationaryIndustrialSchema,
  },
};

export async function validateBatteryPassExport(
  admin: Parameters<typeof loadBatteryWorkspace>[0],
  productId: string,
  baseUrl: string,
) {
  const workspace = await loadBatteryWorkspace(admin, productId);
  const schemaEntry = schemaByCode[workspace.classification.schemaCode];
  if (!schemaEntry) {
    throw new ApiError(
      409,
      "BATTERYPASS_SCHEMA_UNAVAILABLE",
      "No imported BatteryPass-Ready validation Schema is available for this battery category.",
    );
  }
  if (!workspace.profile || !workspace.items.length) {
    throw new ApiError(409, "BATTERYPASS_ITEM_REQUIRED", "Save the battery model profile and create an item before exporting.");
  }

  const payload = buildBatteryPassPayload(workspace, baseUrl);
  const validate = ajv.compile(schemaEntry.schema);
  const valid = Boolean(validate(payload));
  const errors = (validate.errors || []).map((error) => ({
    instancePath: error.instancePath,
    keyword: error.keyword,
    message: error.message,
    params: error.params,
  }));
  const identifier = String(workspace.product.dpp_id || workspace.product.id).replace(/[^A-Za-z0-9._-]/g, "_");
  return {
    valid,
    errors,
    payload,
    schemaCode: workspace.classification.schemaCode,
    schemaId: schemaEntry.schema.$id || null,
    filename: `batterypass-${schemaEntry.filename}-${identifier}.json`,
  };
}

export async function createBatteryPassExport(
  admin: Parameters<typeof loadBatteryWorkspace>[0],
  productId: string,
  baseUrl: string,
) {
  const result = await validateBatteryPassExport(admin, productId, baseUrl);
  if (!result.valid) {
    throw new ApiError(
      409,
      "BATTERYPASS_EXPORT_INVALID",
      "The current product data does not satisfy the selected BatteryPass-Ready validation Schema.",
      { schemaCode: result.schemaCode, errors: result.errors },
    );
  }
  return result;
}

export async function createBatteryPassLmtExport(
  admin: Parameters<typeof loadBatteryWorkspace>[0],
  productId: string,
  baseUrl: string,
) {
  const result = await createBatteryPassExport(admin, productId, baseUrl);
  if (result.schemaCode !== "battery.lmt") {
    throw new ApiError(409, "BATTERYPASS_LMT_REQUIRED", "This export is only available for LMT batteries.");
  }
  return result;
}
