import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { PublicDppClient } from "@/components/PublicDppClient";

async function safeSelect(supabase: ReturnType<typeof createSupabaseClient>, table: string, productId: string, orderBy = "created_at") {
  try {
    const { data } = await supabase.from(table).select("*").eq("product_id", productId).order(orderBy, { ascending: orderBy.includes("date") });
    return data || [];
  } catch {
    return [];
  }
}

async function getData(slug: string) {
  const supabase = createSupabaseClient();
  const { data: product } = await supabase.from("products").select("*").eq("public_slug", slug).eq("status", "published").single();
  if (!product) return null;
  const [materials, certificates, esg, bom, traceability, circularity, consumerTransparency, digitalIdentity, documents, governance] = await Promise.all([
    safeSelect(supabase, "product_materials", product.id),
    safeSelect(supabase, "product_certificates", product.id),
    safeSelect(supabase, "product_esg_metrics", product.id),
    safeSelect(supabase, "product_bom", product.id),
    safeSelect(supabase, "product_traceability", product.id, "event_date"),
    safeSelect(supabase, "product_circularity", product.id),
    safeSelect(supabase, "product_consumer_transparency", product.id),
    safeSelect(supabase, "product_digital_identity", product.id),
    safeSelect(supabase, "product_documents", product.id),
    safeSelect(supabase, "product_data_governance", product.id),
  ]);
  const data = { product, materials, certificates, esg, bom, traceability, circularity, consumerTransparency, digitalIdentity, documents, governance };

  if (slug === "demo-organic-cotton-tshirt") {
    return withDemoDppData(data);
  }

  return data;
}

function withDemoDppData(data: any) {
  const productId = data.product.id;
  const product = {
    ...data.product,
    name: data.product.name || "Organic Cotton T-Shirt",
    name_zh: data.product.name_zh || "有机棉基础 T 恤",
    sku: data.product.sku || "GL-TSHIRT-001",
    brand: data.product.brand || "greanlean",
    category: data.product.category || "Textile & Apparel",
    subcategory: data.product.subcategory || "T-Shirt",
    season: data.product.season || "2026 Core Collection",
    description:
      data.product.description ||
      "A demo digital product passport for sustainable apparel, covering identity, materials, production traceability, ESG metrics, certificates and consumer transparency.",
    description_zh:
      data.product.description_zh ||
      "用于展示欧盟 DPP 数据结构的可持续服装样品，覆盖产品身份、材料来源、生产追溯、ESG、证书和消费者透明化信息。",
    care_instructions:
      data.product.care_instructions ||
      "Machine wash cold with similar colors. Do not bleach. Line dry where possible to reduce energy use.",
    care_instructions_zh:
      data.product.care_instructions_zh ||
      "建议冷水机洗并与相近颜色衣物同洗。不可漂白，优先自然晾干以减少能源消耗。",
    repair_instructions:
      data.product.repair_instructions ||
      "Minor seam damage can be repaired with standard cotton thread. Keep spare buttons and repair before disposal.",
    repair_instructions_zh:
      data.product.repair_instructions_zh ||
      "轻微线缝破损可使用普通棉线修补。建议保留备用纽扣，报废前优先维修。",
    end_of_life_instructions:
      data.product.end_of_life_instructions ||
      "Reuse, donate or return through textile take-back channels. Remove non-textile trims before recycling where required.",
    end_of_life_instructions_zh:
      data.product.end_of_life_instructions_zh ||
      "建议优先再使用、捐赠或通过纺织品回收渠道回收。必要时在回收前移除非纺织辅料。",
  };

  return {
    product,
    materials: data.materials.length
      ? data.materials
      : [
          {
            id: "demo-material-1",
            product_id: productId,
            material_name: "Organic cotton",
            material_name_zh: "有机棉",
            material_type: "Fiber",
            material_type_zh: "纤维",
            percentage: 95,
            recycled_content: 0,
            origin_country: "China",
            chemical_info: "Low-impact reactive dyeing; restricted substances screened against OEKO-TEX requirements.",
            chemical_info_zh: "采用低影响活性染色，并按 OEKO-TEX 要求筛查受限物质。",
            recyclability: "Recyclable through cotton textile recycling streams",
            recyclability_zh: "可进入棉纺织品回收体系",
            certification: "GOTS / OEKO-TEX",
          },
          {
            id: "demo-material-2",
            product_id: productId,
            material_name: "Recycled polyester sewing thread",
            material_name_zh: "再生涤纶缝纫线",
            material_type: "Trim",
            material_type_zh: "辅料",
            percentage: 5,
            recycled_content: 80,
            origin_country: "China",
            chemical_info: "Dope-dyed thread to reduce dyeing water use.",
            chemical_info_zh: "原液着色缝纫线，减少染色用水。",
            recyclability: "Separable during textile recycling when required",
            recyclability_zh: "必要时可在纺织品回收过程中分离",
            certification: "GRS",
          },
        ],
    certificates: data.certificates.length
      ? data.certificates
      : [
          {
            id: "demo-cert-1",
            product_id: productId,
            certificate_name: "GOTS Scope Certificate",
            certificate_name_zh: "GOTS 范围证书",
            certificate_type: "Material",
            certificate_type_zh: "材料认证",
            certificate_number: "GOTS-DEMO-2026-001",
            issuer: "Demo Certification Body",
            issue_date: "2026-01-15",
            expiry_date: "2027-01-14",
            certificate_url: "https://example.com/gots-demo-certificate.pdf",
            verification_status: "verified",
          },
          {
            id: "demo-cert-2",
            product_id: productId,
            certificate_name: "OEKO-TEX Standard 100",
            certificate_name_zh: "OEKO-TEX Standard 100",
            certificate_type: "Chemical safety",
            certificate_type_zh: "化学安全",
            certificate_number: "OEKO-DEMO-2026-018",
            issuer: "Demo Textile Testing Institute",
            issue_date: "2026-02-01",
            expiry_date: "2027-01-31",
            certificate_url: "https://example.com/oeko-tex-demo-certificate.pdf",
            verification_status: "verified",
          },
        ],
    esg: data.esg.length
      ? data.esg
      : [
          {
            id: "demo-esg-1",
            product_id: productId,
            carbon_footprint: 3.2,
            water_usage: 118,
            energy_consumption: 8.4,
            waste_generation: 0.38,
            recycled_content: 4,
            chemical_management: "Restricted substance list and supplier declarations reviewed.",
            lca_report_url: "https://example.com/lca-demo-report.pdf",
            methodology: "Internal screening LCA based on factory energy, material composition and logistics assumptions.",
            verified_by: "greanlean review",
          },
        ],
    bom: data.bom.length
      ? data.bom
      : [
          {
            id: "demo-bom-1",
            product_id: productId,
            component_name: "Main body fabric",
            component_name_zh: "主身面料",
            component_type: "Fabric",
            component_type_zh: "面料",
            quantity: 180,
            unit: "g",
            position: "Body",
          },
          {
            id: "demo-bom-2",
            product_id: productId,
            component_name: "Neck label",
            component_name_zh: "领标",
            component_type: "Label",
            component_type_zh: "标签",
            quantity: 1,
            unit: "pc",
            position: "Inside neck",
          },
        ],
    traceability: data.traceability.length
      ? data.traceability
      : [
          {
            id: "demo-trace-1",
            product_id: productId,
            event_type: "material sourcing",
            event_name: "Organic cotton yarn sourced",
            event_name_zh: "采购有机棉纱线",
            event_date: "2026-03-18",
            country: "China",
            city: "Aksu",
            facility_name: "Demo Organic Cotton Cooperative",
            facility_name_zh: "示例有机棉合作社",
            transport_method: "Truck",
            verification_status: "verified",
            notes: "Supplier declaration and scope certificate checked.",
            notes_zh: "已核查供应商声明和范围证书。",
          },
          {
            id: "demo-trace-2",
            product_id: productId,
            event_type: "manufacturing",
            event_name: "Knitting, cutting and sewing",
            event_name_zh: "织造、裁剪与缝制",
            event_date: "2026-04-22",
            country: "China",
            city: "Ningbo",
            facility_name: "Demo Garment Factory",
            facility_name_zh: "示例服装工厂",
            transport_method: "Internal transfer",
            verification_status: "verified",
            notes: "Production batch record linked to SKU GL-TSHIRT-001.",
            notes_zh: "生产批次记录已关联 SKU GL-TSHIRT-001。",
          },
          {
            id: "demo-trace-3",
            product_id: productId,
            event_type: "transport",
            event_name: "Export shipment to EU warehouse",
            event_name_zh: "出口运输至欧盟仓库",
            event_date: "2026-05-06",
            country: "Germany",
            city: "Hamburg",
            facility_name: "Demo EU Distribution Warehouse",
            facility_name_zh: "示例欧盟分拨仓",
            transport_method: "Sea freight + rail",
            verification_status: "pending",
            notes: "Shipment data reserved for carrier API connection.",
            notes_zh: "运输数据预留给后续承运商 API 对接。",
          },
        ],
    circularity: data.circularity.length
      ? data.circularity
      : [
          {
            id: "demo-circularity-1",
            product_id: productId,
            repairability_score: 72,
            recyclability_score: 81,
            take_back_program: "Eligible for brand textile take-back and resale screening.",
            resale_supported: true,
            remanufacturing_supported: false,
            disassembly_guide: "Remove neck label and trims if required by recycler.",
            recycling_instructions: "Sort as cotton-rich textile waste.",
            end_of_life_info: "Designed for reuse first, then textile recycling.",
          },
        ],
    consumerTransparency: data.consumerTransparency.length
      ? data.consumerTransparency
      : [
          {
            id: "demo-consumer-1",
            product_id: productId,
            brand_story: "This product demonstrates how apparel data can be turned into a consumer-readable digital passport.",
            brand_story_zh: "该产品用于展示如何把服装数据转化为消费者可读的数字产品护照。",
            sustainability_story: "Organic cotton, lower-impact dyeing and documented supplier traceability are recorded in this DPP.",
            sustainability_story_zh: "本 DPP 记录有机棉、低影响染色和供应商追溯信息。",
            consumer_notice: "Color may vary slightly by batch. Scan this page again before resale or recycling for updated product information.",
            consumer_notice_zh: "不同批次颜色可能略有差异。转售或回收前可再次扫码查看更新后的产品信息。",
            packaging_info: "Recycled paper hangtag and recyclable polybag where local infrastructure accepts it.",
          },
        ],
    digitalIdentity: data.digitalIdentity.length
      ? data.digitalIdentity
      : [
          {
            id: "demo-identity-1",
            product_id: productId,
            product_uuid: "7b78c8c6-8f0d-4e0e-a9f6-demo000001",
            gtin: "06900000000012",
            style_id: "STYLE-TEE-ORG-001",
            batch_id: "BATCH-2026-001",
            serial_id: "DEMO-TEE-0001",
            digital_link_url: "https://www.greanlean.com/p/demo-organic-cotton-tshirt",
            qr_code_id: "QR-DPP-DEMO-001",
            nfc_id: "NFC-RESERVED",
            rfid_epc: "RFID-RESERVED",
          },
        ],
    documents: data.documents.length
      ? data.documents
      : [
          {
            id: "demo-document-1",
            product_id: productId,
            document_name: "Demo LCA Summary",
            document_type: "LCA",
            file_url: "https://example.com/lca-demo-report.pdf",
            file_size: "420 KB",
            language: "EN / ZH",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
        ],
    governance: data.governance.length
      ? data.governance
      : [
          {
            id: "demo-governance-1",
            product_id: productId,
            data_source: "Supplier declarations, certificates, factory batch records and logistics documents.",
            data_owner: "greanlean admin",
            audit_status: "Internal review completed",
            data_quality_score: 86,
          },
        ],
  };
}

export default async function PublicDppPage({ params }: { params: { slug: string } }) {
  const data = await getData(params.slug);
  if (!data) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const dppUrl = `${site}/p/${data.product.public_slug}`;
  return <PublicDppClient data={data} dppUrl={dppUrl} />;
}
