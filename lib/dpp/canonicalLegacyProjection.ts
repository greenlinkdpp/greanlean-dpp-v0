import {
  CANONICAL_MODULE_CODES,
  type CanonicalField,
  type CanonicalPublicationSnapshot,
  type CanonicalRecord,
} from "./canonicalPublication.ts";

type Row = Record<string, any>;

export function isCanonicalPublicationSnapshot(
  value: unknown,
): value is CanonicalPublicationSnapshot {
  const supportedSchemas = new Set([
    "https://greanlean.com/schemas/dpp-publication/1.0",
    "greanlean.dpp.publication",
  ]);
  return Boolean(
    value
      && typeof value === "object"
      && supportedSchemas.has(String((value as any).schema || ""))
      && (value as any).modules
      && (value as any).publication,
  );
}

function meaningful(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function fieldValue(field: CanonicalField | undefined) {
  if (!field) return null;
  const value = field.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const object = value as Record<string, unknown>;
  if (meaningful(object.value)) return object.value;
  const valueKey = Object.keys(object).find((key) => /Value$/.test(key));
  return valueKey ? object[valueKey] : value;
}

function display(field: CanonicalField | undefined, locale: "en" | "zh") {
  if (!field) return null;
  return field.display?.[locale] || fieldValue(field);
}

function recordField(record: CanonicalRecord, code: string) {
  return record.fields.find((field) => field.code === code);
}

function allFields(snapshot: CanonicalPublicationSnapshot) {
  return CANONICAL_MODULE_CODES.flatMap((code) => {
    const module = snapshot.modules[code];
    return [
      ...module.fields,
      ...module.records.flatMap((record) => record.fields),
    ];
  });
}

function findField(snapshot: CanonicalPublicationSnapshot, code: string) {
  return allFields(snapshot).find((field) => field.code === code);
}

function recordRows<T extends Row>(
  records: CanonicalRecord[],
  recordType: string,
  mapper: (record: CanonicalRecord) => T,
): T[] {
  return records
    .filter((record) => record.recordType === recordType)
    .map((record, index) => {
      const mapped = mapper(record);
      return {
        ...mapped,
        id: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(mapped.id || ""))
          ? `${recordType}-${index + 1}`
          : mapped.id,
      } as T;
    });
}

function sectorFieldRows(snapshot: CanonicalPublicationSnapshot) {
  const reservedPrefixes = [
    "identity.",
    "materials.",
    "environment.",
    "traceability.",
    "evidence.",
    "circularity.",
    "lifecycle.",
  ];
  return (["materials", "environment", "performance", "sector", "circularity", "lifecycle"] as const)
    .flatMap((code) => snapshot.modules[code].fields)
    .filter((field) =>
      !reservedPrefixes.some((prefix) => field.code.startsWith(prefix)),
    )
    .map((field) => ({
      id: field.sourceRecord?.id || field.code,
      module_key: field.code.startsWith("battery.")
        ? "battery"
        : "sector",
      field_key: field.code,
      field_label: field.label.en || field.code,
      field_label_zh: field.label.zh || field.label.en || field.code,
      field_value: fieldValue(field),
      field_value_json: typeof field.value === "object" ? field.value : null,
      unit: field.unit || null,
      visibility_level: field.accessLevel.toLowerCase(),
      evidence_status: field.verificationStatus.toLowerCase(),
      observed_at: field.observedAt || null,
      updated_at: field.updatedAt || null,
    }));
}

function batteryPresentation(snapshot: CanonicalPublicationSnapshot) {
  const value = (code: string) => fieldValue(findField(snapshot, code));
  return {
    modelIdentifier: value("battery.battery_model_identifier"),
    chemistry: value("battery.battery_chemistry"),
    massKg: value("battery.battery_mass"),
    ratedCapacityAh: value("battery.rated_capacity"),
    nominalVoltageV: value("battery.nominal_voltage"),
    maximumPowerW: value("battery.maximum_permitted_battery_power"),
    initialEfficiencyPercent: value("battery.initial_round_trip_energy_efficiency"),
    expectedCalendarYears: value("battery.expected_lifetime_in_calendar_years"),
    expectedCycles: value("battery.expected_lifetime_number_of_charge_discharge_cycles"),
    idleTemperatureMinC: value("battery.temperature_range_idle_state_lower_boundary"),
    idleTemperatureMaxC: value("battery.temperature_range_idle_state_upper_boundary"),
    carbonFootprintKgCo2e: value("battery.battery_carbon_footprint_per_functional_unit"),
    serialNumber: value("battery.battery_serial_number")
      || value("battery.item.serial_identifier")
      || fieldValue(findField(snapshot, "identity.serial_id")),
  };
}

export function canonicalPublicationToLegacyDpp(
  snapshot: CanonicalPublicationSnapshot,
  liveProduct: Row,
) {
  const identity = snapshot.modules.identity;
  const materials = snapshot.modules.materials;
  const environment = snapshot.modules.environment;
  const evidence = snapshot.modules.evidence;
  const traceability = snapshot.modules.traceability;
  const circularity = snapshot.modules.circularity;
  const lifecycle = snapshot.modules.lifecycle;
  const identityValue = (code: string) => fieldValue(
    identity.fields.find((field) => field.code === code),
  );

  const product: Row = {
    id: snapshot.publication.dppId,
    name: display(findField(snapshot, "identity.product_name"), "en")
      || liveProduct.name,
    name_zh: display(findField(snapshot, "identity.product_name"), "zh")
      || liveProduct.name_zh,
    brand: identityValue("identity.brand") || liveProduct.brand,
    description: display(findField(snapshot, "identity.description"), "en")
      || liveProduct.description,
    description_zh: display(findField(snapshot, "identity.description"), "zh")
      || liveProduct.description_zh,
    category: identityValue("identity.category") || liveProduct.category,
    category_code: identityValue("identity.category") || liveProduct.category_code,
    main_image: identityValue("identity.main_image") || liveProduct.main_image,
    season: identityValue("identity.season") || liveProduct.season,
    care_instructions: display(findField(snapshot, "identity.care_instructions"), "en")
      || liveProduct.care_instructions,
    care_instructions_zh: display(findField(snapshot, "identity.care_instructions"), "zh")
      || liveProduct.care_instructions_zh,
    repair_instructions: display(findField(snapshot, "identity.repair_instructions"), "en")
      || liveProduct.repair_instructions,
    repair_instructions_zh: display(findField(snapshot, "identity.repair_instructions"), "zh")
      || liveProduct.repair_instructions_zh,
    end_of_life_instructions: display(findField(snapshot, "identity.end_of_life_instructions"), "en")
      || liveProduct.end_of_life_instructions,
    end_of_life_instructions_zh: display(findField(snapshot, "identity.end_of_life_instructions"), "zh")
      || liveProduct.end_of_life_instructions_zh,
    dpp_id: snapshot.publication.dppId,
    sku: identityValue("identity.sku") || liveProduct.sku,
    unique_product_identifier: identityValue("identity.upi")
      || liveProduct.unique_product_identifier,
    sector_code: snapshot.classification.sectorCode,
    dpp_profile_key: snapshot.classification.profileKey,
    granularity_level: snapshot.classification.productGranularity,
    current_version: String(snapshot.publication.version || liveProduct.current_version || ""),
    public_slug: liveProduct.public_slug,
    status: "published",
    created_at: snapshot.publication.publishedAt,
    updated_at: snapshot.publication.publishedAt,
  };

  const materialRows = recordRows(materials.records, "material", (record) => ({
    id: record.id,
    material_name: display(recordField(record, "materials.material_name"), "en"),
    material_name_zh: display(recordField(record, "materials.material_name"), "zh"),
    material_type: display(recordField(record, "materials.material_type"), "en"),
    material_type_zh: display(recordField(record, "materials.material_type"), "zh"),
    percentage: fieldValue(recordField(record, "materials.percentage")),
    recycled_content: fieldValue(recordField(record, "materials.recycled_content")),
    origin_country: fieldValue(recordField(record, "materials.origin_country")),
    chemical_info: display(recordField(record, "materials.chemical_information"), "en"),
    chemical_info_zh: display(recordField(record, "materials.chemical_information"), "zh"),
    recyclability: display(recordField(record, "materials.recyclability"), "en"),
    recyclability_zh: display(recordField(record, "materials.recyclability"), "zh"),
  }));

  const componentRows = recordRows(materials.records, "component", (record) => ({
    id: record.id,
    component_name: display(recordField(record, "materials.component_name"), "en"),
    component_name_zh: display(recordField(record, "materials.component_name"), "zh"),
    component_type: display(recordField(record, "materials.component_type"), "en"),
    component_type_zh: display(recordField(record, "materials.component_type"), "zh"),
    quantity: fieldValue(recordField(record, "materials.quantity")),
    unit: recordField(record, "materials.quantity")?.unit || null,
    position: fieldValue(recordField(record, "materials.position")),
  }));

  const esgRows = recordRows(
    environment.records,
    "environmental_assessment",
    (record) => ({
      id: record.id,
      carbon_footprint: fieldValue(recordField(record, "environment.carbon_footprint")),
      water_usage: fieldValue(recordField(record, "environment.water_usage")),
      energy_consumption: fieldValue(recordField(record, "environment.energy_consumption")),
      waste_generation: fieldValue(recordField(record, "environment.waste_generation")),
      recycled_content: fieldValue(recordField(record, "environment.recycled_content")),
      chemical_management: fieldValue(recordField(record, "environment.chemical_management")),
      methodology: fieldValue(recordField(record, "environment.methodology")),
      verified_by: fieldValue(recordField(record, "environment.verification")),
    }),
  );

  const traceabilityRows = recordRows(
    traceability.records,
    "traceability_event",
    (record) => ({
      id: record.id,
      event_type: fieldValue(recordField(record, "traceability.event_type")),
      event_name: display(recordField(record, "traceability.event_name"), "en"),
      event_name_zh: display(recordField(record, "traceability.event_name"), "zh"),
      event_date: fieldValue(recordField(record, "traceability.event_date")),
      country: fieldValue(recordField(record, "traceability.country")),
      city: fieldValue(recordField(record, "traceability.city")),
      facility_name: display(recordField(record, "traceability.facility"), "en"),
      facility_name_zh: display(recordField(record, "traceability.facility"), "zh"),
      supplier_name: fieldValue(recordField(record, "traceability.supplier")),
      transport_method: fieldValue(recordField(record, "traceability.transport")),
      notes: display(recordField(record, "traceability.notes"), "en"),
      notes_zh: display(recordField(record, "traceability.notes"), "zh"),
      verification_status: recordField(record, "traceability.event_type")
        ?.verificationStatus.toLowerCase(),
    }),
  );

  const lifecycleRows = lifecycle.records.map((record, index) => ({
    id: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(record.id) ? `lifecycle-${index + 1}` : record.id,
    event_type: fieldValue(recordField(record, "lifecycle.event_type")),
    event_name: fieldValue(recordField(record, "lifecycle.event_type")),
    event_name_zh: recordField(record, "lifecycle.event_type")?.label.zh,
    event_date: fieldValue(recordField(record, "lifecycle.event_time")),
    notes: fieldValue(recordField(record, "lifecycle.event_data")),
    verification_status: recordField(record, "lifecycle.event_type")
      ?.verificationStatus.toLowerCase(),
  }));

  const certificateRows = recordRows(evidence.records, "certificate", (record) => ({
    id: record.id,
    certificate_name: display(recordField(record, "evidence.title"), "en"),
    certificate_name_zh: display(recordField(record, "evidence.title"), "zh"),
    certificate_type: display(recordField(record, "evidence.type"), "en"),
    certificate_type_zh: display(recordField(record, "evidence.type"), "zh"),
    certificate_number: fieldValue(recordField(record, "evidence.number")),
    issuer: fieldValue(recordField(record, "evidence.issuer")),
    issue_date: fieldValue(recordField(record, "evidence.issue_date")),
    expiry_date: fieldValue(recordField(record, "evidence.expiry_date")),
    verification_status: recordField(record, "evidence.title")
      ?.verificationStatus.toLowerCase(),
  }));

  const documentRows = snapshot.evidenceIndex.map((item, index) => ({
    id: /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item.id) ? `evidence-${index + 1}` : item.id,
    document_name: item.title.en || item.title.zh,
    document_name_zh: item.title.zh || item.title.en,
    document_type: item.evidenceType,
    file_url: item.url,
    version: item.fileVersion,
    evidence_hash: item.hash,
    hash_algorithm: item.hashAlgorithm,
    verification_status: item.verificationStatus.toLowerCase(),
    visibility_level: item.accessLevel.toLowerCase(),
  }));

  const circularityRows = recordRows(
    circularity.records,
    "circularity_assessment",
    (record) => ({
      id: record.id,
      repairability_score: fieldValue(recordField(record, "circularity.repairability_score")),
      recyclability_score: fieldValue(recordField(record, "circularity.recyclability_score")),
      take_back_program: fieldValue(recordField(record, "circularity.take_back_program")),
      disassembly_guide: fieldValue(recordField(record, "circularity.disassembly_guide")),
      recycling_instructions: fieldValue(recordField(record, "circularity.recycling_instructions")),
    }),
  );

  return {
    product,
    digitalIdentity: [{
      product_uuid: identityValue("identity.upi"),
      gtin: identityValue("identity.gtin"),
      rfid_epc: identityValue("identity.sgtin"),
      batch_id: identityValue("identity.batch_id"),
      serial_id: identityValue("identity.serial_id"),
      digital_link_url: identityValue("identity.digital_link"),
    }],
    materials: materialRows,
    bom: componentRows,
    esg: esgRows,
    traceability: [...traceabilityRows, ...lifecycleRows],
    certificates: certificateRows,
    documents: documentRows,
    circularity: circularityRows,
    consumerTransparency: [],
    governance: [{
      data_source: snapshot.governance.sourceFingerprint,
      audit_status: snapshot.integrity.digest ? "verified" : "pending",
    }],
    registrySubmissions: [],
    registrationProofs: [],
    evidenceLinks: [],
    blockchainAnchors: [],
    sectorFieldValues: sectorFieldRows(snapshot),
    batteryPresentation: batteryPresentation(snapshot),
    publication: {
      id: `${snapshot.publication.dppId}:v${snapshot.publication.version || 0}`,
      publicationId: `${snapshot.publication.dppId}:v${snapshot.publication.version || 0}`,
      version: snapshot.publication.version,
      publishedAt: snapshot.publication.publishedAt,
      snapshotHash: snapshot.integrity.digest,
      schemaVersion: snapshot.schemaVersion,
      profileKey: snapshot.classification.profileKey,
      profileVersion: snapshot.classification.profileVersion,
    },
  };
}
