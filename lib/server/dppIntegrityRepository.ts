import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ApiError } from "./apiRoute";

type AdminClient = SupabaseClient<any, "public", any>;

function databaseError(
  operation: string,
  error: { code?: string; message?: string } | null,
) {
  if (!error) return;
  throw new ApiError(
    500,
    "DPP_INTEGRITY_DATABASE_ERROR",
    `The ${operation} could not be completed.`,
    { database: `${error.code || ""} ${error.message || ""}`.trim() },
  );
}

export async function loadDppIntegrityWorkspace(
  admin: AdminClient,
  productId: string,
) {
  const { data: product, error: productError } = await admin
    .from("products")
    .select("id,dpp_id,sector_code,dpp_profile_key")
    .eq("id", productId)
    .maybeSingle();
  databaseError("product integrity lookup", productError);
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "The product was not found.");

  const [pointerResult, connectorResult, requestResult, registryResult] = await Promise.all([
    admin
      .from("dpp_product_publication_pointer")
      .select("publication_id,updated_at")
      .eq("product_id", productId)
      .maybeSingle(),
    admin
      .from("dpp_blockchain_connector")
      .select("id,connector_code,chain_name,chain_id,network,contract_address,configuration_reference,status,verified_at,updated_at")
      .order("updated_at", { ascending: false }),
    admin
      .from("dpp_blockchain_anchor_request")
      .select("id,publication_id,connector_id,anchored_hash,hash_algorithm,request_status,requested_at")
      .eq("product_id", productId)
      .order("requested_at", { ascending: false })
      .limit(20),
    admin
      .from("registry_submission")
      .select("id,environment,submission_status,mapping_version,registry_schema_version,submitted_at,completed_at,error_code")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  [
    pointerResult,
    connectorResult,
    requestResult,
    registryResult,
  ].forEach((result) => databaseError("integrity workspace read", result.error));

  const publicationResult = pointerResult.data?.publication_id
    ? await admin
      .from("dpp_publication")
      .select("id,version_number,status,snapshot_hash,published_at")
      .eq("id", pointerResult.data.publication_id)
      .maybeSingle()
    : { data: null, error: null };
  databaseError("current publication read", publicationResult.error);

  const requestIds = (requestResult.data || []).map((request) => String(request.id));
  const receiptResult = requestIds.length
    ? await admin
      .from("dpp_blockchain_anchor_receipt")
      .select("id,request_id,connector_id,transaction_hash,block_number,explorer_url,confirmed_at,recorded_at")
      .in("request_id", requestIds)
      .order("recorded_at", { ascending: false })
    : { data: [], error: null };
  databaseError("blockchain receipt read", receiptResult.error);

  const activeConnector = (connectorResult.data || []).find(
    (connector) => connector.status === "ACTIVE" && connector.verified_at,
  ) || null;
  const receiptByRequest = new Map(
    (receiptResult.data || []).map((receipt) => [String(receipt.request_id), receipt]),
  );

  return {
    product: {
      dppId: product.dpp_id,
      sectorCode: product.sector_code,
      profileKey: product.dpp_profile_key,
    },
    currentPublication: publicationResult.data,
    connectors: connectorResult.data || [],
    activeConnector,
    registrySubmissions: registryResult.data || [],
    anchorRequests: (requestResult.data || []).map((request) => ({
      ...request,
      receipt: receiptByRequest.get(String(request.id)) || null,
    })),
  };
}

export async function requestDppBlockchainAnchor(
  admin: AdminClient,
  productId: string,
  user: User,
) {
  const workspace = await loadDppIntegrityWorkspace(admin, productId);
  if (!workspace.currentPublication?.id) {
    throw new ApiError(
      409,
      "PUBLISHED_DPP_REQUIRED",
      "A current immutable publication is required before blockchain anchoring.",
    );
  }
  if (!workspace.activeConnector) {
    throw new ApiError(
      409,
      "BLOCKCHAIN_CONNECTOR_NOT_CONFIGURED",
      "No verified blockchain connector is configured. No anchor request or transaction hash was created.",
    );
  }

  const { data, error } = await admin.rpc("greanlean_request_blockchain_anchor", {
    target_product_id: productId,
    target_publication_id: workspace.currentPublication.id,
    requesting_user_id: user.id,
  });
  if (error?.code === "23505") {
    throw new ApiError(
      409,
      "BLOCKCHAIN_ANCHOR_ALREADY_REQUESTED",
      "This publication already has an anchor request for the active connector.",
    );
  }
  databaseError("blockchain anchor request", error);
  return data;
}
