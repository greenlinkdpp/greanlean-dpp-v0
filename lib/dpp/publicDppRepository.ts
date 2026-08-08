import type { SupabaseClient } from "@supabase/supabase-js";
import { projectBatteryValuesIntoLegacyDpp } from "../battery/legacyProjection.ts";
import {
  canonicalPublicationToLegacyDpp,
  isCanonicalPublicationSnapshot,
} from "./canonicalLegacyProjection";

type PublicClient = SupabaseClient<any, "public", any>;

const PUBLISHED_STATUSES = ["published", "updated", "expired"];

const PRE_MIGRATION_IDENTIFIERS: Record<string, string[]> = {
  "DPP-TEX-TSHIRT-001": ["DPP-DEMO-001", "demo-organic-cotton-tshirt"],
  "organic-cotton-tshirt-001": ["DPP-DEMO-001", "demo-organic-cotton-tshirt"],
  "DPP-CE-EARBUDS-001": ["DPP-AUDIO-DEMO-001", "demo-wireless-earbuds"],
  "wireless-earbuds-001": ["DPP-AUDIO-DEMO-001", "demo-wireless-earbuds"],
  "DPP-GV-ESS-14K3-000001": [
    "DPP-BAT-IND-ESS-14336-001",
    "green-vault-ess-14-3",
  ],
};

function hasPublicationSnapshot(snapshot: unknown): snapshot is { publicDpp: Record<string, unknown> } {
  return Boolean(
    snapshot
      && typeof snapshot === "object"
      && "publicDpp" in snapshot
      && (snapshot as any).publicDpp
      && typeof (snapshot as any).publicDpp === "object",
  );
}

async function productByIdentifier(
  client: PublicClient,
  identifier: string,
  includeDraft: boolean,
) {
  for (const column of ["dpp_id", "public_slug"] as const) {
    let query = client.from("products").select("*").eq(column, identifier);
    if (!includeDraft) query = query.in("status", PUBLISHED_STATUSES);
    const { data } = await query.maybeSingle();
    if (data) return data;
  }
  return null;
}

async function productById(
  client: PublicClient,
  productId: string,
  includeDraft: boolean,
) {
  let query = client.from("products").select("*").eq("id", productId);
  if (!includeDraft) query = query.in("status", PUBLISHED_STATUSES);
  const { data } = await query.maybeSingle();
  return data || null;
}

export async function resolvePublicProduct(
  client: PublicClient,
  identifier: string,
  includeDraft = false,
) {
  const direct = await productByIdentifier(client, identifier, includeDraft);
  if (direct) return direct;

  const { data: alias } = await client
    .from("dpp_identifier_alias")
    .select("product_id")
    .eq("alias", identifier)
    .eq("is_active", true)
    .maybeSingle();
  if (alias?.product_id) {
    const resolved = await productById(client, alias.product_id, includeDraft);
    if (resolved) return resolved;
  }

  for (const legacyIdentifier of PRE_MIGRATION_IDENTIFIERS[identifier] || []) {
    const legacy = await productByIdentifier(client, legacyIdentifier, includeDraft);
    if (legacy) return legacy;
  }
  return null;
}

async function safeSelect(
  client: PublicClient,
  table: string,
  productId: string,
  orderBy = "created_at",
) {
  const { data } = await client
    .from(table)
    .select("*")
    .eq("product_id", productId)
    .order(orderBy, { ascending: orderBy.includes("date") });
  return data || [];
}

async function publicationSnapshot(
  client: PublicClient,
  productId: string,
  identifier: string,
  includeDraft: boolean,
) {
  if (!includeDraft) {
    const { data: canonical, error: canonicalError } = await client.rpc(
      "greanlean_public_canonical_dpp_snapshot",
      { target_identifier: identifier },
    );
    if (!canonicalError && canonical) return canonical;

    const { data: projected, error: projectionError } = await client.rpc(
      "greanlean_public_dpp_snapshot",
      { target_identifier: identifier },
    );
    if (!projectionError && projected) return projected;
  }

  const { data } = await client
    .from("product_versions")
    .select("snapshot,version,created_at")
    .eq("product_id", productId)
    .in("lifecycle_status", PUBLISHED_STATUSES)
    .order("created_at", { ascending: false })
    .limit(20);
  const publication = (data || []).find((row: any) => hasPublicationSnapshot(row.snapshot));
  if (!publication || !hasPublicationSnapshot(publication.snapshot)) return null;
  return {
    ...publication.snapshot.publicDpp,
    publication: {
      version: publication.version,
      publishedAt: publication.created_at,
    },
  };
}

async function publicBatteryValues(client: PublicClient, productId: string) {
  const { data: profile } = await client
    .from("battery_model_profile")
    .select("id")
    .eq("product_id", productId)
    .maybeSingle();
  if (!profile) return {};
  const { data: rows } = await client
    .from("battery_field_value")
    .select("value_json,field_definition!inner(field_code)")
    .eq("battery_model_profile_id", profile.id)
    .is("battery_batch_id", null)
    .is("battery_item_id", null)
    .in("field_definition.field_code", [
      "battery.battery_model_identifier",
      "battery.battery_mass",
      "battery.battery_chemistry",
      "battery.rated_capacity",
      "battery.nominal_voltage",
      "battery.maximum_permitted_battery_power",
      "battery.initial_round_trip_energy_efficiency",
      "battery.expected_lifetime_in_calendar_years",
      "battery.expected_lifetime_number_of_charge_discharge_cycles",
      "battery.temperature_range_idle_state_lower_boundary",
      "battery.temperature_range_idle_state_upper_boundary",
      "battery.battery_carbon_footprint_per_functional_unit",
      "battery.battery_serial_number",
    ]);
  return Object.fromEntries((rows || []).flatMap((row: any) => {
    const definition = Array.isArray(row.field_definition)
      ? row.field_definition[0]
      : row.field_definition;
    return definition?.field_code ? [[definition.field_code, row.value_json]] : [];
  }));
}

async function legacyPublicData(client: PublicClient, product: any) {
  const [
    materials,
    certificates,
    esg,
    bom,
    traceability,
    circularity,
    consumerTransparency,
    digitalIdentity,
    documents,
    governance,
    registrySubmissions,
    registrationProofs,
    evidenceLinks,
    blockchainAnchors,
    sectorFieldValues,
  ] = await Promise.all([
    safeSelect(client, "product_materials", product.id),
    safeSelect(client, "product_certificates", product.id),
    safeSelect(client, "product_esg_metrics", product.id),
    safeSelect(client, "product_bom", product.id),
    safeSelect(client, "product_traceability", product.id, "event_date"),
    safeSelect(client, "product_circularity", product.id),
    safeSelect(client, "product_consumer_transparency", product.id),
    safeSelect(client, "product_digital_identity", product.id),
    safeSelect(client, "product_documents", product.id),
    safeSelect(client, "product_data_governance", product.id),
    safeSelect(client, "dpp_registry_submissions", product.id),
    safeSelect(client, "dpp_registration_proofs", product.id),
    safeSelect(client, "dpp_evidence_links", product.id),
    safeSelect(client, "dpp_blockchain_anchors", product.id),
    safeSelect(client, "product_sector_field_values", product.id),
  ]);
  return {
    product,
    materials,
    certificates,
    esg,
    bom,
    traceability,
    circularity,
    consumerTransparency,
    digitalIdentity,
    documents,
    governance,
    registrySubmissions,
    registrationProofs,
    evidenceLinks,
    blockchainAnchors,
    sectorFieldValues: sectorFieldValues.filter((row: any) =>
      !["state_of_health", "state_of_charge"].includes(
        String(row.field_key || "").toLowerCase(),
      )),
  };
}

export async function loadLegacyPublicDppData(
  client: PublicClient,
  identifier: string,
  includeDraft = false,
) {
  const product = await resolvePublicProduct(client, identifier, includeDraft);
  if (!product) return null;
  let data = await legacyPublicData(client, product);
  if (product.sector_code === "battery") {
    data = projectBatteryValuesIntoLegacyDpp(
      data,
      await publicBatteryValues(client, product.id),
    );
  }
  return data;
}

function mergeSnapshotProduct(snapshot: any, product: any) {
  return {
    ...snapshot,
    product: {
      ...product,
      ...(snapshot.product || {}),
      id: product.id,
      dpp_id: product.dpp_id,
      public_slug: product.public_slug,
      status: product.status,
      current_version: product.current_version,
      updated_at: product.updated_at,
    },
  };
}

export async function loadPublicDppData(
  client: PublicClient,
  identifier: string,
  includeDraft = false,
) {
  if (!includeDraft) {
    const { data: itemResult, error: itemError } = await client.rpc(
      "greanlean_p0_public_item_snapshot",
      { target_identifier: identifier },
    );
    if (!itemError && itemResult?.productIdentifier && isCanonicalPublicationSnapshot(itemResult.snapshot)) {
      const itemProduct = await productByIdentifier(client, String(itemResult.productIdentifier), false);
      if (itemProduct) return canonicalPublicationToLegacyDpp(itemResult.snapshot, itemProduct);
    }
  }
  const product = await resolvePublicProduct(client, identifier, includeDraft);
  if (!product) return null;

  const snapshot = await publicationSnapshot(
    client,
    product.id,
    product.dpp_id || product.public_slug || identifier,
    includeDraft,
  );
  if (snapshot) {
    if (isCanonicalPublicationSnapshot(snapshot)) {
      return canonicalPublicationToLegacyDpp(snapshot, product);
    }
    return mergeSnapshotProduct(snapshot, product);
  }

  return loadLegacyPublicDppData(client, identifier, includeDraft);
}
