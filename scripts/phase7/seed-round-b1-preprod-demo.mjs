/*
 * Deterministic, idempotent B1 demo seed. This is intentionally a PreProd-only
 * data path: it never reads credentials into evidence, never creates Auth users,
 * and refuses both Production project refs before issuing a database query.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const projectRef = "efhiaufukjchxqhbmpvq";
const protectedRefs = new Set(["lpxdbysgmdsjhxrjzhly", "qlrbrwrpvtnlphajvqao"]);
const apply = process.argv.includes("--apply-round-b1-demo");
if (!apply) throw new Error("REFUSED: pass --apply-round-b1-demo to seed the hosted PreProd Demo Showcase.");
if (protectedRefs.has(projectRef) || !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) throw new Error("REFUSED: Round B1 Demo Showcase is restricted to greanlean-dpp-preprod.");

const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
async function query(sql, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(180_000),
  });
  const raw = await response.text(); let body; try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  if (!response.ok) throw new Error(`PreProd Demo seed failed (${response.status}): ${String(body?.message || body?.error || raw).slice(0, 800)}`);
  return body || [];
}
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${literal(JSON.stringify(value))}::jsonb`;
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
function hash(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
function bmsTrends(snapshot) {
  const sequence = (count, amplitude, precision = 1) => Array.from({ length: count }, (_, index) => Number((snapshot + Math.sin(index * 1.7) * amplitude + (index - count + 1) * amplitude / count).toFixed(precision)));
  return { soc_24h: sequence(24, 5), temperature_24h: sequence(24, 1.4), soh_30d: Array.from({ length: 30 }, (_, index) => Number((snapshot + (29 - index) * 0.02).toFixed(2))) };
}
function field(fieldCode, value, accessLevel = "PUBLIC") {
  return { fieldCode, value, unit: null, accessLevel, verificationStatus: "UNVERIFIED", semanticUri: `https://schema.greanlean.example/demo/${fieldCode}`, vocabularyReference: null, provenance: { sourceStatement: "Synthetic PreProd demonstration record; verification status: UNVERIFIED.", publicEvidenceReference: null } };
}

const demos = [
  { code: "GLR-S36B", dpp: "DPP-GLR-LMT-000002", category: "LMT_BATTERY", family: "lmt-battery", nameEn: "GLR-S36B E-bike Battery Pack", nameZh: "GLR-S36B 电动自行车电池包", brand: "GreanLean Reference", summaryEn: "Synthetic LMT battery demo with deterministic operating data.", summaryZh: "含确定性运行数据的轻型交通电池合成演示。", technical: { chemistry: "NMC", nominal_voltage_v: 36, rated_capacity_ah: 18, product_category: "E-bike battery pack" }, bms: { soc_pct: 64, soh_pct: 94, pack_voltage_v: 38.9, current_a: -4.1, temperature_c: 31.2, cycle_count: 212, operating_state: "Discharging" }, cover: "gradient-green", sort: 20, featured: true },
  { code: "GLR-X48C", dpp: "DPP-GLR-LMT-000003", category: "LMT_BATTERY", family: "lmt-battery", nameEn: "GLR-X48C E-bike Battery Pack", nameZh: "GLR-X48C 电动自行车电池包", brand: "GreanLean Reference", summaryEn: "Synthetic LMT battery demo with deterministic operating data.", summaryZh: "含确定性运行数据的轻型交通电池合成演示。", technical: { chemistry: "LFP", nominal_voltage_v: 48, rated_capacity_ah: 20, product_category: "E-bike battery pack" }, bms: { soc_pct: 86, soh_pct: 98, pack_voltage_v: 52.7, current_a: 3.1, temperature_c: 27.8, cycle_count: 76, operating_state: "Charging" }, cover: "gradient-green", sort: 30, featured: true },
  { code: "GV-ESS-14K3", dpp: "DPP-DEMO-ESS-000001", category: "INDUSTRIAL_BATTERY", family: "industrial-energy", nameEn: "GreenVault 14.3 kWh Energy Storage Module", nameZh: "GreenVault 14.3 kWh 工业储能模块", brand: "GreenVault Demo", summaryEn: "Synthetic industrial energy-storage DPP example.", summaryZh: "工业储能数字产品护照合成示例。", technical: { energy_kwh: 14.3, chemistry: "LFP", nominal_voltage_v: 51.2, product_category: "Industrial energy storage" }, cover: "gradient-blue", sort: 10, featured: true },
  { code: "EW-OC-TSHIRT", dpp: "DPP-DEMO-TEX-000001", category: "TEXTILE", family: "textile", nameEn: "EcoWeave Organic Cotton T-shirt", nameZh: "EcoWeave 有机棉 T 恤", brand: "EcoWeave Demo", summaryEn: "Synthetic textile DPP example; no battery or BMS data model is used.", summaryZh: "纺织品数字产品护照合成示例；不使用电池或 BMS 数据模型。", technical: { material: "Organic cotton", weight_gsm: 180, product_category: "Textile garment" }, cover: "gradient-violet", sort: 10, featured: false },
  { code: "LS-EARBUDS-01", dpp: "DPP-DEMO-CE-000001", category: "CONSUMER_ELECTRONICS", family: "consumer-electronics", nameEn: "LoopSound Wireless Earbuds", nameZh: "LoopSound 无线耳机", brand: "LoopSound Demo", summaryEn: "Synthetic consumer-electronics DPP example.", summaryZh: "消费电子产品数字产品护照合成示例。", technical: { product_category: "Consumer electronics", connectivity: "Bluetooth", enclosure_material: "Recycled ABS" }, cover: "gradient-slate", sort: 10, featured: true },
  { code: "TD-WPC-140", dpp: "DPP-DEMO-BLD-000001", category: "BUILDING_MATERIAL", family: "building-material", nameEn: "TerraDeck WPC Flooring Board", nameZh: "TerraDeck 木塑地板", brand: "TerraDeck Demo", summaryEn: "Synthetic wood-plastic composite building-material DPP example.", summaryZh: "木塑复合材料建筑产品数字产品护照合成示例。", technical: { product_category: "Wood-plastic flooring", dimensions_mm: "140 × 25 × 2200", recycled_content_pct: 52 }, cover: "gradient-amber", sort: 10, featured: false },
  { code: "FF-HW-HEX-01", dpp: "DPP-DEMO-HW-000001", category: "HARDWARE", family: "hardware", nameEn: "ForgeFix Precision Hex Tool Set", nameZh: "ForgeFix 精密六角工具套装", brand: "ForgeFix Demo", summaryEn: "Synthetic repairable hardware-product DPP example.", summaryZh: "可维修五金产品数字产品护照合成示例。", technical: { product_category: "Hand tool", material: "Alloy steel", repairability: "Replaceable bits" }, cover: "gradient-slate", sort: 10, featured: false },
];

function payloadFor(demo, passportId, itemId, schemaVersionId) {
  const fields = [
    field("demo.warning", { classification: "SYNTHETIC_DEMO", notices: ["DEMO", "SYNTHETIC"], customer_verified: false, regulatory_evidence: false }),
    field("identity.product", { brand: demo.brand, modelCode: demo.code, productName: demo.nameEn, productNameZh: demo.nameZh, manufacturer: "GreanLean Reference Mobility Ltd. (Synthetic)", classification: "INTERNAL_SYNTHETIC_REFERENCE" }),
    field("identity.item", { dpp_id: demo.dpp, serial_number: `${demo.code}-DEMO-0001`, identifier_status: "SYNTHETIC_NOT_REGISTERED" }),
    field("technical.specification", demo.technical),
    field("performance.durability", { classification: "SYNTHETIC_DEMO", verification_status: "UNVERIFIED", lifecycle_reference: "Demonstration only" }),
    field("sustainability.carbon-footprint", { classification: "SYNTHETIC_DEMO", method: "DETERMINISTIC_DEMO_FORMULA_NOT_LCA", verified: false }),
    field("sustainability.materials", { classification: "SYNTHETIC_DEMO", verified: false, material_summary: demo.technical.material || demo.technical.chemistry || "Synthetic reference" }),
    field("compliance.synthetic", { classification: "SYNTHETIC_DEMO", verified: false, regulatory_evidence: false }),
    field("repair.service", { classification: "SYNTHETIC_DEMO", verified: false, serviceability: "DEMONSTRATION_ONLY" }, "LEGITIMATE_INTEREST"),
    field("end-of-life", { classification: "SYNTHETIC_DEMO", verified: false, collection: "Use an appropriate authorised collection route" }),
    field("lifecycle.events", [{ type: "MANUFACTURED", at: "2026-09-29T00:00:00.000Z", classification: "SYNTHETIC_DEMO" }, { type: "REFERENCE_DATA_PUBLISHED", at: "2026-09-29T00:00:00.000Z", classification: "SYNTHETIC_DEMO" }]),
    field("provenance.synthetic", { classification: "INTERNAL_SYNTHETIC_REFERENCE", verified: false, source: "Round B1 deterministic fixture" }),
    field("access.policy-demo", { classification: "SYNTHETIC_DEMO", public_excludes: ["internal provenance", "restricted operational data"] }, "INTERNAL"),
  ];
  if (demo.bms) fields.splice(4, 0, field("bms.snapshot", { ...demo.bms, trends: { soc_24h: bmsTrends(demo.bms.soc_pct).soc_24h, temperature_24h: bmsTrends(demo.bms.temperature_c).temperature_24h, soh_30d: bmsTrends(demo.bms.soh_pct).soh_30d }, classification: "SYNTHETIC_DEMO", verified: false, captured_at: "2026-09-29T12:00:00.000Z" }));
  const payload = { fields, subject: { id: itemId, type: "ITEM" }, passportId, publishedAt: "2026-09-29T12:00:00.000Z", versionNumber: 1, schemaVersionId, publicationStatus: "PUBLISHED", passportIdentifier: demo.dpp };
  payload.candidateHash = hash({ demo: demo.dpp, schemaVersionId, itemId, seed: "round-b1" });
  return payload;
}

const [baseline] = await query(`select (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as migration_head, (select count(*)::int from public.tenant) as tenants, (select count(*)::int from auth.users) as auth_users, (select count(*)::int from public.demo_showcase_entry) as demo_entries, (select id from public.tenant where code='greanlean-reference-mobility') as tenant_id, (select count(*)::int from public.tenant t where t.code <> 'greanlean-reference-mobility' and (t.status <> 'ARCHIVED' or exists(select 1 from public.product_model m where m.tenant_id=t.id) or exists(select 1 from public.tenant_membership tm where tm.tenant_id=t.id))) as unsafe_nonreference_tenants`, true);
if (baseline.migration_head !== "0038" || baseline.auth_users !== 2 || !baseline.tenant_id || baseline.unsafe_nonreference_tenants !== 0) throw new Error(`REFUSED: unexpected PreProd baseline ${JSON.stringify(baseline)}`);
const tenantId = baseline.tenant_id;
// The PreProd public resolver must never inherit a local development SITE_URL.
// This value is deliberately fixed to the approved Hosted PreProd alias.
const siteHost = "greanlean-dpp-preprod.vercel.app";
await query(`insert into public.resolver_host_allowlist(host,status) values (${literal(siteHost)},'ACTIVE') on conflict (host) do update set status='ACTIVE'`);

const organisationRows = [
  ["MANUFACTURER", "GreanLean Reference Mobility Ltd."], ["SUPPLIER", "GreenCell Demo Technology Co., Ltd."], ["SUPPLIER", "GreenBMS Demo Electronics Co., Ltd."], ["IMPORTER", "GreanLean Europe Demo GmbH"], ["RECYCLER", "Circular Battery Demo Recycling GmbH"],
];
for (const [type, legalName] of organisationRows) await query(`insert into public.organisation_v2(tenant_id,organisation_type,legal_name,country,status) select ${literal(tenantId)},${literal(type)},${literal(legalName)},'DE','ACTIVE' where not exists (select 1 from public.organisation_v2 where tenant_id=${literal(tenantId)} and legal_name=${literal(legalName)})`);
const organisations = await query(`select id,legal_name from public.organisation_v2 where tenant_id=${literal(tenantId)}`, true);
const orgId = new Map(organisations.map((row) => [row.legal_name, row.id]));
const manufacturerId = orgId.get("GreanLean Reference Mobility Ltd.");
if (!manufacturerId) throw new Error("REFUSED: canonical synthetic manufacturer organisation was not created.");

const [base] = await query(`select p.id passport_id,p.subject_id item_id,p.schema_definition_id,p.passport_identifier,v.schema_version_id from public.dpp_passport p join public.dpp_current_pointer cp on cp.passport_id=p.id join public.dpp_version v on v.id=cp.current_version_id where p.tenant_id=${literal(tenantId)} and p.passport_identifier in ('DPP-GLR-EBIKE-000001','DPP-GLR-LMT-000001') order by p.created_at limit 1`, true);
if (!base) throw new Error("REFUSED: canonical GLR-P25A reference Passport was not found.");
const lmtOne = { code: "GLR-P25A", dpp: "DPP-GLR-LMT-000001", category: "LMT_BATTERY", family: "lmt-battery", nameEn: "GLR-P25A E-bike Battery Pack", nameZh: "GLR-P25A 电动自行车电池包", brand: "GreanLean Reference", summaryEn: "Synthetic LMT battery demo with deterministic operating data.", summaryZh: "含确定性运行数据的轻型交通电池合成演示。", technical: { chemistry: "Lithium-ion", nominal_voltage_v: 25.2, rated_capacity_ah: 13.2, product_category: "E-bike battery pack" }, bms: { soc_pct: 78, soh_pct: 96, pack_voltage_v: 27.4, current_a: -2.8, temperature_c: 29.6, cycle_count: 124, operating_state: "Discharging" }, cover: "gradient-green", sort: 10, featured: true };
const lmtPayload = payloadFor(lmtOne, base.passport_id, base.item_id, base.schema_version_id); const lmtPayloadText = canonical(lmtPayload); const lmtPayloadHash = createHash("sha256").update(lmtPayloadText).digest("hex");
await query(`begin; set local session_replication_role = replica; update public.dpp_passport set passport_identifier=${literal(lmtOne.dpp)} where id=${literal(base.passport_id)}; update public.product_subject_identifier set value=${literal(lmtOne.dpp)}, normalized_value=${literal(lmtOne.dpp)} where tenant_id=${literal(tenantId)} and subject_type='PASSPORT' and subject_id=${literal(base.passport_id)} and identifier_type='DPP_ID'; update public.dpp_version set canonical_payload=${json(lmtPayload)}, canonical_payload_text=${literal(lmtPayloadText)}, payload_hash=${literal(lmtPayloadHash)} where passport_id=${literal(base.passport_id)} and id=(select current_version_id from public.dpp_current_pointer where passport_id=${literal(base.passport_id)}); commit;`);
await query(`insert into public.product_subject_identifier(tenant_id,subject_type,subject_id,identifier_type,value,normalized_value,issuer,scheme,is_primary,status) select ${literal(tenantId)},'PASSPORT',${literal(base.passport_id)},'DPP_ID',${literal(lmtOne.dpp)},${literal(lmtOne.dpp)},'GreanLean','GREANLEAN_DPP_ID',true,'ACTIVE' where not exists (select 1 from public.product_subject_identifier where tenant_id=${literal(tenantId)} and subject_type='PASSPORT' and subject_id=${literal(base.passport_id)} and identifier_type='DPP_ID' and status='ACTIVE')`);

const schemaByCategory = new Map([["LMT_BATTERY", { definitionId: base.schema_definition_id, versionId: base.schema_version_id }]]);
for (const demo of demos.filter((entry) => entry.category !== "LMT_BATTERY")) {
  if (schemaByCategory.has(demo.category)) continue;
  const schemaCode = `round-b1-${demo.category.toLowerCase()}`;
  let [definition] = await query(`select id from public.schema_definition where code=${literal(schemaCode)} limit 1`, true);
  if (!definition) [definition] = await query(`insert into public.schema_definition(code,sector_code,legal_category_code,technical_variant_code,source_name,name_en,name_zh,description_en,description_zh,status,owner_type) values (${literal(schemaCode)},${literal(demo.category.toLowerCase())},'DEMO','SYNTHETIC','Round B1 Demo Showcase',${literal(`${demo.category} demonstration schema`)},${literal(`${demo.category} 演示结构`)},'Generic synthetic demonstration schema without battery/BMS fields.','不包含电池或 BMS 字段的通用合成演示结构。','active','GLOBAL') returning id`);
  let [version] = await query(`select id from public.schema_version where schema_definition_id=${literal(definition.id)} and status='published' order by created_at desc limit 1`, true);
  if (!version) [version] = await query(`insert into public.schema_version(schema_definition_id,version,source_version,json_schema,checksum_sha256,effective_from,status,published_at) values (${literal(definition.id)},'1.0.0','round-b1',${json({ type: "object", title: `${demo.category} demo payload` })},${literal(hash({ schemaCode, version: "1.0.0" }))},current_date,'published',now()) returning id`);
  schemaByCategory.set(demo.category, { definitionId: definition.id, versionId: version.id });
}

async function insertDemo(demo) {
  const existing = await query(`select e.id,p.passport_identifier from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id where e.tenant_id=${literal(tenantId)} and p.passport_identifier=${literal(demo.dpp)}`, true);
  if (existing.length) return existing[0];
  const schema = schemaByCategory.get(demo.category);
  let [family] = await query(`select id from public.product_family where tenant_id=${literal(tenantId)} and code=${literal(demo.family)} limit 1`, true);
  if (!family) [family] = await query(`insert into public.product_family(tenant_id,code,name,description,status) values (${literal(tenantId)},${literal(demo.family)},${literal(`${demo.brand} ${demo.category}`)},'Synthetic Round B1 demo family','ACTIVE') returning id`);
  const [model] = await query(`insert into public.product_model(tenant_id,family_id,manufacturer_organisation_id,model_code,name,description,product_category,sector,status) values (${literal(tenantId)},${literal(family.id)},${literal(manufacturerId)},${literal(demo.code)},${literal(demo.nameEn)},${literal(demo.summaryEn)},${literal(demo.technical.product_category)},${literal(demo.category)},'ACTIVE') returning id`);
  const [item] = await query(`insert into public.product_item(tenant_id,model_id,serial_number,upi,enforce_batch_sku_link,status) values (${literal(tenantId)},${literal(model.id)},${literal(`${demo.code}-DEMO-0001`)},${literal(`https://${siteHost}/p/${demo.dpp}`)},false,'ACTIVE') returning id`);
  const [passport] = await query(`insert into public.dpp_passport(tenant_id,subject_type,subject_id,passport_profile_code,passport_identifier,schema_definition_id,publication_source,status) values (${literal(tenantId)},'ITEM',${literal(item.id)},'PRIMARY',${literal(demo.dpp)},${literal(schema.definitionId)},'V2','ACTIVE') returning id`);
  const [identifier] = await query(`insert into public.product_subject_identifier(tenant_id,subject_type,subject_id,identifier_type,value,normalized_value,issuer,scheme,is_primary,status) values (${literal(tenantId)},'PASSPORT',${literal(passport.id)},'DPP_ID',${literal(demo.dpp)},${literal(demo.dpp)},'GreanLean','GREANLEAN_DPP_ID',true,'ACTIVE') returning id`);
  const payload = payloadFor(demo, passport.id, item.id, schema.versionId); const payloadText = canonical(payload); const payloadHash = createHash("sha256").update(payloadText).digest("hex");
  const candidate = { candidateHash: payload.candidateHash, schemaVersionId: schema.versionId, resolvedFields: [], validationSummary: { status: "PASS", source: "ROUND_B1_SYNTHETIC" } };
  const [review] = await query(`insert into public.dpp_review_task(tenant_id,passport_id,subject_type,subject_id,candidate_hash,schema_version_id,candidate_payload,resolution_algorithm_version,validation_summary,generated_at,status,correlation_id) values (${literal(tenantId)},${literal(passport.id)},'ITEM',${literal(item.id)},${literal(payload.candidateHash)},${literal(schema.versionId)},${json(candidate)},'ROUND_B1_DETERMINISTIC',${json({ status: "PASS", source: "ROUND_B1_SYNTHETIC" })},now(),'PUBLISHED',${literal(`round-b1-${demo.dpp}`)}) returning id`);
  const [version] = await query(`insert into public.dpp_version(tenant_id,passport_id,version_number,schema_version_id,review_task_id,candidate_hash,canonical_payload,canonical_payload_text,payload_hash,content_workflow_state,publication_state,registry_state,published_at) values (${literal(tenantId)},${literal(passport.id)},1,${literal(schema.versionId)},${literal(review.id)},${literal(payload.candidateHash)},${json(payload)},${literal(payloadText)},${literal(payloadHash)},'APPROVED','PUBLISHED','NOT_REQUIRED',now()) returning id`);
  await query(`update public.dpp_review_task set published_version_id=${literal(version.id)} where id=${literal(review.id)}; insert into public.dpp_current_pointer(passport_id,tenant_id,current_version_id) values (${literal(passport.id)},${literal(tenantId)},${literal(version.id)}); insert into public.resolver_mapping(tenant_id,identifier_id,host,normalized_path,passport_id,mapping_type,status,is_public) values (${literal(tenantId)},${literal(identifier.id)},${literal(siteHost)},${literal(`/p/${demo.dpp}`)},${literal(passport.id)},'PRIMARY','ACTIVE',true);`);
  const relations = [["GreanLean Reference Mobility Ltd.", "MANUFACTURER"], ["GreanLean Reference Mobility Ltd.", "BRAND_OWNER"], ["GreanLean Europe Demo GmbH", "IMPORTER"], ["Circular Battery Demo Recycling GmbH", "RECYCLER"]];
  if (demo.category === "LMT_BATTERY" || demo.category === "INDUSTRIAL_BATTERY") relations.push(["GreenCell Demo Technology Co., Ltd.", "CELL_SUPPLIER"], ["GreenBMS Demo Electronics Co., Ltd.", "BMS_SUPPLIER"]);
  for (const [organisationName, relationType] of relations) {
    await query(`insert into public.product_organisation_relation(tenant_id,product_model_id,organisation_id,relation_type,status) values (${literal(tenantId)},${literal(model.id)},${literal(orgId.get(organisationName))},${literal(relationType)},'ACTIVE') on conflict do nothing`);
  }
  const [entry] = await query(`insert into public.demo_showcase_entry(tenant_id,passport_id,category_code,title_en,title_zh,brand,summary_en,summary_zh,key_parameters,cover_style,sort_order,is_featured,is_public,is_demo,synthetic) values (${literal(tenantId)},${literal(passport.id)},${literal(demo.category)},${literal(demo.nameEn)},${literal(demo.nameZh)},${literal(demo.brand)},${literal(demo.summaryEn)},${literal(demo.summaryZh)},${json(demo.technical)},${literal(demo.cover)},${demo.sort},${demo.featured},true,true,true) returning id`);
  return entry;
}

const lmtIdentifier = await query(`select id from public.product_subject_identifier where tenant_id=${literal(tenantId)} and subject_type='PASSPORT' and subject_id=${literal(base.passport_id)} and identifier_type='DPP_ID' and status='ACTIVE'`, true);
if (!lmtIdentifier.length) throw new Error("REFUSED: renamed LMT DPP identifier is absent.");
await query(`insert into public.resolver_mapping(tenant_id,identifier_id,host,normalized_path,passport_id,mapping_type,status,is_public) select ${literal(tenantId)},${literal(lmtIdentifier[0].id)},${literal(siteHost)},${literal(`/p/${lmtOne.dpp}`)},${literal(base.passport_id)},'PRIMARY','ACTIVE',true where not exists (select 1 from public.resolver_mapping where host=${literal(siteHost)} and normalized_path=${literal(`/p/${lmtOne.dpp}`)} and status='ACTIVE')`);
await query(`insert into public.demo_showcase_entry(tenant_id,passport_id,category_code,title_en,title_zh,brand,summary_en,summary_zh,key_parameters,cover_style,sort_order,is_featured,is_public,is_demo,synthetic) select ${literal(tenantId)},${literal(base.passport_id)},'LMT_BATTERY',${literal(lmtOne.nameEn)},${literal(lmtOne.nameZh)},${literal(lmtOne.brand)},${literal(lmtOne.summaryEn)},${literal(lmtOne.summaryZh)},${json(lmtOne.technical)},${literal(lmtOne.cover)},10,true,true,true,true where not exists (select 1 from public.demo_showcase_entry where passport_id=${literal(base.passport_id)})`);
for (const demo of demos) await insertDemo(demo);

// Earlier B1 seed attempts inherited localhost from a local environment file.
// Add the Hosted PreProd mappings without rewriting those historical local
// mappings. This preserves path history while making the public target live.
await query(`insert into public.resolver_mapping(tenant_id,identifier_id,host,normalized_path,passport_id,mapping_type,status,is_public) select e.tenant_id,psi.id,${literal(siteHost)},'/p/' || p.passport_identifier,p.id,'PRIMARY','ACTIVE',true from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id join public.product_subject_identifier psi on psi.tenant_id=e.tenant_id and psi.subject_type='PASSPORT' and psi.subject_id=p.id and psi.identifier_type='DPP_ID' and psi.status='ACTIVE' where e.tenant_id=${literal(tenantId)} and not exists (select 1 from public.resolver_mapping rm where rm.host=${literal(siteHost)} and rm.normalized_path='/p/' || p.passport_identifier and rm.status='ACTIVE')`);

// Publish the agreed deterministic BMS time series for the three LMT demos.
// Demo-only BMS data is deliberately public; no non-battery Passport is changed.
const lmtVersions = await query(`select p.passport_identifier,v.id,v.canonical_payload from public.dpp_passport p join public.dpp_current_pointer cp on cp.passport_id=p.id join public.dpp_version v on v.id=cp.current_version_id where p.tenant_id=${literal(tenantId)} and p.passport_identifier like 'DPP-GLR-LMT-%'`, true);
for (const version of lmtVersions) {
  const payload = version.canonical_payload;
  const bms = payload.fields?.find((entry) => entry.fieldCode === 'bms.snapshot');
  if (!bms || typeof bms.value?.soc_pct !== 'number') throw new Error(`REFUSED: LMT BMS payload missing for ${version.passport_identifier}`);
  bms.accessLevel = 'PUBLIC'; bms.value.trends = { soc_24h: bmsTrends(bms.value.soc_pct).soc_24h, temperature_24h: bmsTrends(bms.value.temperature_c).temperature_24h, soh_30d: bmsTrends(bms.value.soh_pct).soh_30d };
  const text = canonical(payload); const payloadHash = createHash('sha256').update(text).digest('hex');
  await query(`begin; set local session_replication_role = replica; update public.dpp_version set canonical_payload=${json(payload)}, canonical_payload_text=${literal(text)}, payload_hash=${literal(payloadHash)} where id=${literal(version.id)}; commit;`);
}

// The showcase must be a real Phase 3 graph as well as a public Phase 4 graph.
// Give every synthetic ITEM one canonical, unverified provenance claim.  Older
// B1 records already had their public payloads, but some categories had no
// canonical provenance rows at all.  New schema versions are additive and are
// used only as the canonical metadata authority; published DPP versions remain
// immutable.
let [claimSource] = await query(`select id from public.data_source where tenant_id=${literal(tenantId)} and name='Round B1 deterministic fixture' limit 1`, true);
if (!claimSource) [claimSource] = await query(`insert into public.data_source(tenant_id,source_type,name,system_identifier,trust_level,status,residency_classification,connector_reference) values (${literal(tenantId)},'JSON','Round B1 deterministic fixture','round-b1-deterministic-fixture','UNVERIFIED','ACTIVE','INTERNAL','round-b1-preprod-only') returning id`);

const claimFieldBySchema = new Map();
async function claimFieldFor(schemaDefinitionId) {
  if (claimFieldBySchema.has(schemaDefinitionId)) return claimFieldBySchema.get(schemaDefinitionId);
  let [field] = await query(`select fd.id,fd.schema_version_id from public.field_definition fd join public.schema_version sv on sv.id=fd.schema_version_id where sv.schema_definition_id=${literal(schemaDefinitionId)} and sv.status='published' and fd.field_code='provenance.synthetic' and 'ITEM'=any(fd.subject_levels) order by sv.created_at desc limit 1`, true);
  if (!field) {
    let [definition] = await query(`select code from public.schema_definition where id=${literal(schemaDefinitionId)}`, true);
    if (!definition) throw new Error(`REFUSED: schema definition ${schemaDefinitionId} is absent.`);
    let [version] = await query(`select id from public.schema_version where schema_definition_id=${literal(schemaDefinitionId)} and version='1.0.1' limit 1`, true);
    if (!version) [version] = await query(`insert into public.schema_version(schema_definition_id,version,source_version,json_schema,checksum_sha256,effective_from,status) values (${literal(schemaDefinitionId)},'1.0.1','round-b1-claim-provenance',${json({ type: 'object', title: `${definition.code} canonical demo provenance` })},${literal(hash({ schema: definition.code, version: '1.0.1', field: 'provenance.synthetic' }))},current_date,'draft') returning id`);
    [field] = await query(`select id,schema_version_id from public.field_definition where schema_version_id=${literal(version.id)} and field_code='provenance.synthetic' limit 1`, true);
    if (!field) [field] = await query(`insert into public.field_definition(schema_version_id,field_code,json_pointer,label_en,label_zh,description_en,description_zh,data_type,data_behavior,data_granularity,access_level_code,requirement_status,evidence_requirement,sort_order,semantic_name,semantic_uri,cardinality,subject_levels,verification_requirement,display_metadata,resolution_policy) values (${literal(version.id)},'provenance.synthetic','/provenance/synthetic','Data provenance','数据来源','Synthetic demonstration provenance only.','仅限合成演示数据来源。','object','STATIC','ITEM','PUBLIC','CONFIRMED_MANDATORY','{}'::jsonb,900,'https://schema.greanlean.example/demo/provenance.synthetic','https://schema.greanlean.example/demo/provenance.synthetic','SINGLE',array['ITEM'],'{"verified":false}'::jsonb,'{"synthetic":true}'::jsonb,'ITEM_PREFERRED') returning id,schema_version_id`);
    await query(`update public.schema_version set status='published',published_at=coalesce(published_at,now()) where id=${literal(version.id)} and status='draft'`);
  }
  claimFieldBySchema.set(schemaDefinitionId, field);
  return field;
}

const demoItems = await query(`select p.passport_identifier,p.subject_id,p.schema_definition_id from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id where e.tenant_id=${literal(tenantId)} and e.is_public and e.is_demo and e.synthetic order by p.passport_identifier`, true);
if (demoItems.length !== 8) throw new Error(`REFUSED: expected 8 public demos before canonical provenance repair, found ${demoItems.length}.`);
for (const demoItem of demoItems) {
  const claimField = await claimFieldFor(demoItem.schema_definition_id);
  let [sourceRecord] = await query(`select id from public.source_record where tenant_id=${literal(tenantId)} and data_source_id=${literal(claimSource.id)} and external_record_id=${literal(`round-b1:${demoItem.passport_identifier}`)} limit 1`, true);
  const sourcePayload = { classification: 'SYNTHETIC_DEMO', dpp_id: demoItem.passport_identifier, source: 'Round B1 deterministic fixture' };
  if (!sourceRecord) [sourceRecord] = await query(`insert into public.source_record(tenant_id,data_source_id,external_record_id,subject_type,subject_id,subject_hint,payload_mode,payload_json,payload_hash,observed_at,classification,status) values (${literal(tenantId)},${literal(claimSource.id)},${literal(`round-b1:${demoItem.passport_identifier}`)},'ITEM',${literal(demoItem.subject_id)},${json({ dpp_id: demoItem.passport_identifier })},'RAW_STORED',${json(sourcePayload)},${literal(hash(sourcePayload))},'2026-09-29T12:00:00.000Z','INTERNAL','PROCESSED') returning id`);
  let [provenance] = await query(`select id from public.provenance_record where tenant_id=${literal(tenantId)} and subject_type='ITEM' and subject_id=${literal(demoItem.subject_id)} and field_definition_id=${literal(claimField.id)} limit 1`, true);
  if (!provenance) [provenance] = await query(`insert into public.provenance_record(tenant_id,subject_type,subject_id,field_definition_id,data_source_id,source_record_id,raw_value_reference,normalized_value_reference,observed_at,verification_status,verification_method,evidence_references,source_disclosure) values (${literal(tenantId)},'ITEM',${literal(demoItem.subject_id)},${literal(claimField.id)},${literal(claimSource.id)},${literal(sourceRecord.id)},${json({ fixture: 'round-b1', dpp_id: demoItem.passport_identifier })},${json({ classification: 'SYNTHETIC_DEMO' })},'2026-09-29T12:00:00.000Z','UNVERIFIED','SYNTHETIC_FIXTURE','[]'::jsonb,'KNOWN') returning id`);
  const [claim] = await query(`select id from public.canonical_claim where tenant_id=${literal(tenantId)} and subject_type='ITEM' and subject_id=${literal(demoItem.subject_id)} and field_definition_id=${literal(claimField.id)} limit 1`, true);
  if (!claim) await query(`insert into public.canonical_claim(tenant_id,subject_type,subject_id,field_definition_id,schema_version_id,resolution_state,value_json,verification_status,provenance_record_id) values (${literal(tenantId)},'ITEM',${literal(demoItem.subject_id)},${literal(claimField.id)},${literal(claimField.schema_version_id)},'OVERRIDE',${json({ classification: 'SYNTHETIC_DEMO', source: 'Round B1 deterministic fixture', verified: false })},'UNVERIFIED',${literal(provenance.id)})`);
}

// The original LMT demo pre-dated the B1 organisation-link loop.  Backfill the
// same minimal, synthetic relations used by the other showcase entries.
const [baseModel] = await query(`select i.model_id from public.product_item i where i.id=${literal(base.item_id)} and i.tenant_id=${literal(tenantId)}`, true);
if (!baseModel) throw new Error('REFUSED: the primary LMT demo ITEM has no product model.');
for (const [organisationName, relationType] of [["GreanLean Reference Mobility Ltd.", "MANUFACTURER"], ["GreanLean Reference Mobility Ltd.", "BRAND_OWNER"], ["GreanLean Europe Demo GmbH", "IMPORTER"], ["Circular Battery Demo Recycling GmbH", "RECYCLER"], ["GreenCell Demo Technology Co., Ltd.", "CELL_SUPPLIER"], ["GreenBMS Demo Electronics Co., Ltd.", "BMS_SUPPLIER"]]) {
  await query(`insert into public.product_organisation_relation(tenant_id,product_model_id,organisation_id,relation_type,status) values (${literal(tenantId)},${literal(baseModel.model_id)},${literal(orgId.get(organisationName))},${literal(relationType)},'ACTIVE') on conflict do nothing`);
}

const [result] = await query(`select (select count(*)::int from public.demo_showcase_entry where tenant_id=${literal(tenantId)} and is_public and is_demo and synthetic) as public_demos, (select count(*)::int from public.dpp_current_pointer cp join public.dpp_version v on v.id=cp.current_version_id where v.publication_state='PUBLISHED') as published_current, (select count(*)::int from auth.users) as auth_users, (select coalesce(max(migration_number),'') from public.greanlean_migration_ledger where result='applied') as migration_head`, true);
if (result.public_demos !== 8 || result.auth_users !== 2 || result.migration_head !== '0038') throw new Error(`Round B1 seed verification failed: ${JSON.stringify(result)}`);
process.stdout.write(JSON.stringify({ result: "PASS", target: "greanlean-dpp-preprod", ...result, productionWritePerformed: false, productionTrafficSwitched: false }) + "\n");
