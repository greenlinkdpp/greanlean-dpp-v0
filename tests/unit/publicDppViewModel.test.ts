import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicDppViewModel } from "../../lib/publicDppViewModel.ts";

const batteryData = {
  product: {
    id: "battery-1",
    name: "48V Battery Pack",
    name_zh: "48V 电池包",
    dpp_id: "DPP-BATTERY-1",
    sku: "BATTERY-48V",
    brand: "Greanlean",
    sector_code: "battery",
    subcategory: "LMT battery",
    status: "published",
    updated_at: "2026-07-20T00:00:00Z",
  },
  digitalIdentity: [{
    gtin: "06900000004804",
    batch_id: "BATCH-1",
    serial_id: "ITEM-1",
  }],
  materials: [{
    id: "material-1",
    material_name: "NMC cell system",
    material_name_zh: "NMC 电芯系统",
    percentage: 68,
    supplier_name: "Restricted supplier",
  }],
  certificates: [{
    id: "certificate-1",
    certificate_name: "Battery safety report",
    issuer: "Demo laboratory",
    certificate_number: "DEMO-001",
    certificate_url: "/api/chemical-document?type=test",
    verification_status: "verified",
  }],
  sectorFieldValues: [
    { field_key: "state_of_health", field_value: "98", visibility_level: "professional" },
    { field_key: "state_of_charge", field_value: "74", visibility_level: "professional" },
  ],
  batteryPresentation: {
    chemistry: "NMC",
    ratedCapacityAh: 15,
    nominalVoltageV: 48,
    expectedCycles: 800,
  },
  batteryOperating: {
    item: {
      id: "item-1",
      serialIdentifier: "ITEM-1",
    },
    summary: {
      latestMeasuredAt: "2026-07-24T10:30:00Z",
      receivedAt: "2026-07-24T10:30:05Z",
      sourceDevice: "INITIAL-IMPORT",
      dataSource: "INITIAL_DATASET",
      qualityStatus: "UNKNOWN",
      verificationStatus: "UNVERIFIED",
      freshnessStatus: "CURRENT",
      updateMode: "DAILY_SNAPSHOT",
    },
    latest: [{
      id: "metric-1",
      metricType: "SOC",
      labelZh: "荷电状态",
      labelEn: "State of charge",
      value: 74,
      unit: "%",
      measuredAt: "2026-07-24T10:30:00Z",
      sourceDevice: "INITIAL-IMPORT",
      dataSource: "INITIAL_DATASET",
      qualityStatus: "UNKNOWN",
      verificationStatus: "UNVERIFIED",
    }],
    history: [{
      id: "history-1",
      metricType: "SOC",
      labelZh: "荷电状态",
      labelEn: "State of charge",
      value: 74,
      unit: "%",
      measuredAt: "2026-07-24T10:30:00Z",
    }],
    events: [{
      id: "event-1",
      eventType: "INSPECTION",
      eventTime: "2026-07-24T10:30:00Z",
      eventData: { noteZh: "例行检查" },
      dataSource: "INITIAL_DATASET",
      qualityStatus: "UNKNOWN",
      verificationStatus: "UNVERIFIED",
    }],
  },
};

test("builds one ordered page model and inserts the battery module at step five", () => {
  const model = buildPublicDppViewModel(batteryData, {
    locale: "zh",
    dppUrl: "https://example.com/p/DPP-BATTERY-1?lang=zh",
  });

  assert.equal(model.audience, "PUBLIC");
  assert.equal(model.sections.length, 9);
  assert.deepEqual(model.sections.map((section) => section.index), [
    "01", "02", "03", "04", "05", "06", "07", "08", "09",
  ]);
  assert.equal(model.sections[4].id, "battery-health");
  assert.equal(model.heroMetrics.length, 4);
});

test("public projection does not expose suppliers or item operating telemetry", () => {
  const model = buildPublicDppViewModel(batteryData, {
    locale: "en",
    audience: "PUBLIC",
    dppUrl: "https://example.com/p/DPP-BATTERY-1?lang=en",
  });
  const serialized = JSON.stringify(model);

  assert.doesNotMatch(serialized, /Restricted supplier/);
  assert.doesNotMatch(serialized, /state_of_health|state_of_charge|\"98\"|\"74\"/);
  assert.doesNotMatch(serialized, /INITIAL-IMPORT|例行检查/);
  assert.match(serialized, /Sign-in and explicit authorisation required/);
});

test("authorised projection includes localized operating snapshots, history and events", () => {
  const model = buildPublicDppViewModel(batteryData, {
    locale: "zh",
    audience: "LEGITIMATE_INTEREST",
    dppUrl: "https://example.com/p/DPP-BATTERY-1?lang=zh",
  });
  const batterySection = model.sections.find((section) => section.id === "battery-health");

  assert.equal(batterySection?.batteryOperating?.latest[0].label, "荷电状态");
  assert.equal(batterySection?.batteryOperating?.summary.dataSource, "初始化数据");
  assert.equal(batterySection?.batteryOperating?.summary.qualityStatus, "未核验");
  assert.equal(batterySection?.batteryOperating?.events[0].title, "检查");
  assert.doesNotMatch(JSON.stringify(batterySection), /demo|synthetic/i);
});

test("generated placeholders and demo evidence are not exposed as verified files", () => {
  const model = buildPublicDppViewModel(batteryData, {
    locale: "en",
    audience: "AUTHORITY_ONLY",
    isPreview: true,
    dppUrl: "https://example.com/p/DPP-BATTERY-1?lang=en",
  });
  const evidence = model.sections.find((section) => section.id === "evidence");
  const certificate = evidence?.items?.find((item) => item.id === "certificate-1");

  assert.equal(certificate?.status, "Evidence pending");
  assert.equal(certificate?.href, undefined);
  assert.doesNotMatch(JSON.stringify(certificate), /Demo laboratory|DEMO-001|chemical-document/);
});
