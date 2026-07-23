import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import lmtSchema from "../../config/battery/schemas/LMT.json";
import { buildBatteryPassLmtPayload } from "../battery/batteryPass.ts";
import { ApiError } from "./apiRoute";
import { loadBatteryWorkspace } from "./batteryRepository";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateLmt = ajv.compile(lmtSchema);

export async function createBatteryPassLmtExport(
  admin: Parameters<typeof loadBatteryWorkspace>[0],
  productId: string,
  baseUrl: string,
) {
  const workspace = await loadBatteryWorkspace(admin, productId);
  if (workspace.classification.schemaCode !== "battery.lmt") {
    throw new ApiError(409, "BATTERYPASS_LMT_REQUIRED", "This export is only available for LMT batteries.");
  }
  if (!workspace.profile || !workspace.items.length) {
    throw new ApiError(409, "BATTERYPASS_ITEM_REQUIRED", "Save the battery model profile and create an item before exporting.");
  }

  const payload = buildBatteryPassLmtPayload(workspace, baseUrl);
  if (!validateLmt(payload)) {
    throw new ApiError(
      409,
      "BATTERYPASS_EXPORT_INVALID",
      "The current product data does not satisfy the BatteryPass LMT validation Schema.",
      {
        errors: (validateLmt.errors || []).map((error) => ({
          instancePath: error.instancePath,
          keyword: error.keyword,
          message: error.message,
          params: error.params,
        })),
      },
    );
  }

  const identifier = String(workspace.product.dpp_id || workspace.product.id).replace(/[^A-Za-z0-9._-]/g, "_");
  return {
    payload,
    filename: `batterypass-lmt-${identifier}.json`,
  };
}
