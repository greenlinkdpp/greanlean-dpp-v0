import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { PublicDppClient } from "@/components/PublicDppClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function safeSelect(supabase: ReturnType<typeof createSupabaseClient>, table: string, productId: string, orderBy = "created_at") {
  try {
    const { data } = await supabase.from(table).select("*").eq("product_id", productId).order(orderBy, { ascending: orderBy.includes("date") });
    return data || [];
  } catch {
    return [];
  }
}

const demoByIdentifier: Record<string, "tshirt" | "electronics" | "flooring" | "furniture"> = {
  "demo-organic-cotton-tshirt": "tshirt",
  "DPP-DEMO-001": "tshirt",
  "demo-wireless-earbuds": "electronics",
  "DPP-AUDIO-DEMO-001": "electronics",
  "demo-wpc-flooring": "flooring",
  "DPP-WPC-MS140K25B": "flooring",
  "demo-office-chair": "furniture",
  "DPP-FURN-DEMO-001": "furniture",
};

async function getData(identifier: string) {
  const supabase = createSupabaseClient();
  const { data: productByDpp } = await supabase.from("products").select("*").eq("dpp_id", identifier).eq("status", "published").maybeSingle();
  const { data: productBySlug } = productByDpp
    ? { data: null }
    : await supabase.from("products").select("*").eq("public_slug", identifier).eq("status", "published").maybeSingle();
  const product = productByDpp || productBySlug;
  if (!product) {
    const demo = demoByIdentifier[identifier];
    if (demo === "electronics") return withElectronicsDppData();
    if (demo === "flooring") return withFlooringDppData();
    if (demo === "furniture") return withFurnitureDppData();
    if (demo === "tshirt") return withDemoDppData({ product: { id: "demo-product" }, materials: [], certificates: [], esg: [], bom: [], traceability: [], circularity: [], consumerTransparency: [], digitalIdentity: [], documents: [], governance: [] });
    return null;
  }

  if (product.public_slug === "demo-wpc-flooring" || product.dpp_id === "DPP-WPC-MS140K25B") {
    return withFlooringDppData({
      product: {
        id: product.id,
        main_image: product.main_image,
      },
    });
  }

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

  if (product.public_slug === "demo-organic-cotton-tshirt" || product.dpp_id === "DPP-DEMO-001") {
    return withDemoDppData(data);
  }

  if (product.public_slug === "demo-wireless-earbuds" || product.dpp_id === "DPP-AUDIO-DEMO-001") {
    return withElectronicsDppData(data);
  }

  if (product.public_slug === "demo-wpc-flooring" || product.dpp_id === "DPP-WPC-MS140K25B") {
    return withFlooringDppData(data);
  }

  if (product.public_slug === "demo-office-chair" || product.dpp_id === "DPP-FURN-DEMO-001") {
    return withFurnitureDppData(data);
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
    main_image: data.product.main_image || "/images/demo-organic-cotton-tshirt.png",
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
            certificate_url: "/api/chemical-document?type=svhc&product=DPP-DEMO-001",
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
            certificate_url: "/api/chemical-document?type=heavy-metals&product=DPP-DEMO-001",
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
            lca_report_url: "/api/dpp-export?format=pdf&product=DPP-DEMO-001",
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
            digital_link_url: "https://www.greanlean.com/p/DPP-DEMO-001",
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
            file_url: "/api/dpp-export?format=pdf&product=DPP-DEMO-001",
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

function withElectronicsDppData(data?: any) {
  const productId = data?.product?.id || "demo-electronics-product";
  const mainImage =
    data?.product?.main_image && !String(data.product.main_image).endsWith(".svg")
      ? data.product.main_image
      : "/images/demo-wireless-earbuds.png";
  const product = {
    ...(data?.product || {}),
    id: productId,
    name: data?.product?.name || "Wireless Bluetooth Earbuds",
    name_zh: data?.product?.name_zh || "无线蓝牙耳机",
    sku: data?.product?.sku || "GL-EARBUDS-001",
    brand: data?.product?.brand || "greanlean",
    category: data?.product?.category || "Consumer Electronics",
    subcategory: data?.product?.subcategory || "Wireless Earbuds",
    season: data?.product?.season || "2026 Audio Export Series",
    public_slug: data?.product?.public_slug || "demo-wireless-earbuds",
    dpp_id: data?.product?.dpp_id || "DPP-AUDIO-DEMO-001",
    main_image: mainImage,
    description:
      data?.product?.description ||
      "A consumer electronics digital product passport demo for EU exports, covering GS1 identifiers, RoHS and REACH evidence, battery and WEEE end-of-life information.",
    description_zh:
      data?.product?.description_zh ||
      "面向出口欧盟消费电子产品的数字产品护照示例，覆盖 GS1 标识、RoHS 与 REACH 证据、电池信息和 WEEE 生命周期结束指引。",
    care_instructions:
      data?.product?.care_instructions ||
      "Keep dry, clean ear tips regularly and avoid prolonged exposure to heat. Use the original charging case and cable where possible.",
    care_instructions_zh:
      data?.product?.care_instructions_zh ||
      "保持干燥，定期清洁耳塞，避免长时间高温暴露。建议使用原配充电盒和线缆。",
    repair_instructions:
      data?.product?.repair_instructions ||
      "Replace ear tips when worn. Battery and charging case repair should be handled by an authorized service provider.",
    repair_instructions_zh:
      data?.product?.repair_instructions_zh ||
      "耳塞磨损后可更换；电池和充电盒维修建议由授权服务商处理。",
    end_of_life_instructions:
      data?.product?.end_of_life_instructions ||
      "Do not dispose with household waste. Send earbuds, charging case and battery-containing parts to authorized WEEE collection points.",
    end_of_life_instructions_zh:
      data?.product?.end_of_life_instructions_zh ||
      "请勿作为生活垃圾丢弃。耳机、充电盒和含电池部件应交至授权 WEEE 回收点。",
  };

  return {
    product,
    materials: data?.materials?.length
      ? data.materials
      : [
          {
            id: "demo-audio-material-1",
            product_id: productId,
            material_name: "Recycled ABS / PC plastic",
            material_name_zh: "再生 ABS / PC 塑料",
            material_type: "Polymer",
            material_type_zh: "聚合物",
            percentage: 45,
            recycled_content: 25,
            origin_country: "China",
            chemical_info: "RoHS restricted substances screened; REACH SVHC below 0.1% w/w.",
            chemical_info_zh: "已筛查 RoHS 受限物质；REACH SVHC 低于 0.1% w/w。",
            recyclability: "WEEE plastics stream after disassembly",
            recyclability_zh: "拆解后进入 WEEE 塑料回收流",
            certification: "RoHS / REACH supplier declaration",
          },
          {
            id: "demo-audio-material-2",
            product_id: productId,
            material_name: "Lithium-ion battery",
            material_name_zh: "锂离子电池",
            material_type: "Battery",
            material_type_zh: "电池",
            percentage: 18,
            recycled_content: 0,
            origin_country: "China",
            chemical_info: "Battery MSDS and UN38.3 transport test available.",
            chemical_info_zh: "提供电池 MSDS 和 UN38.3 运输测试文件。",
            recyclability: "Battery recycling stream",
            recyclability_zh: "进入电池回收流",
            certification: "UN38.3 / IEC 62133",
          },
          {
            id: "demo-audio-material-3",
            product_id: productId,
            material_name: "PCB and electronic components",
            material_name_zh: "PCB 与电子元件",
            material_type: "Electronics",
            material_type_zh: "电子元件",
            percentage: 22,
            recycled_content: 0,
            origin_country: "China",
            chemical_info: "RoHS compliant solder and components.",
            chemical_info_zh: "使用符合 RoHS 要求的焊料和元件。",
            recyclability: "WEEE electronics stream",
            recyclability_zh: "进入 WEEE 电子元件回收流",
            certification: "RoHS",
          },
          {
            id: "demo-audio-material-4",
            product_id: productId,
            material_name: "Silicone ear tips, copper and magnets",
            material_name_zh: "硅胶耳塞、铜和磁件",
            material_type: "Accessories",
            material_type_zh: "配件",
            percentage: 15,
            recycled_content: 0,
            origin_country: "China",
            chemical_info: "Skin-contact materials screened for restricted substances.",
            chemical_info_zh: "接触皮肤材料已进行受限物质筛查。",
            recyclability: "Manual separation recommended",
            recyclability_zh: "建议人工拆解分离",
            certification: "REACH",
          },
        ],
    certificates: data?.certificates?.length
      ? data.certificates
      : [
          {
            id: "demo-audio-cert-1",
            product_id: productId,
            certificate_name: "EU Declaration of Conformity",
            certificate_name_zh: "欧盟符合性声明",
            certificate_type: "DoC / CE",
            certificate_type_zh: "符合性声明 / CE",
            certificate_number: "CE-DOC-AUDIO-2026-001",
            issuer: "Greanlean Electronics Demo Manufacturer",
            issue_date: "2026-05-20",
            expiry_date: "2027-05-19",
            certificate_url: "/api/declaration?product=DPP-AUDIO-DEMO-001",
            verification_status: "verified",
          },
          {
            id: "demo-audio-cert-2",
            product_id: productId,
            certificate_name: "RoHS Restricted Substance Test Report",
            certificate_name_zh: "RoHS 受限物质检测报告",
            certificate_type: "Chemical compliance",
            certificate_type_zh: "化学合规",
            certificate_number: "ROHS-AUDIO-2026-018",
            issuer: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)",
            issue_date: "2026-05-18",
            expiry_date: "2027-05-17",
            certificate_url: "/api/chemical-document?type=heavy-metals&product=DPP-AUDIO-DEMO-001",
            verification_status: "verified",
          },
          {
            id: "demo-audio-cert-3",
            product_id: productId,
            certificate_name: "REACH SVHC Screening",
            certificate_name_zh: "REACH SVHC 筛查",
            certificate_type: "Chemical compliance",
            certificate_type_zh: "化学合规",
            certificate_number: "REACH-AUDIO-2026-026",
            issuer: "Demo Chemical Testing Institute",
            issue_date: "2026-05-20",
            expiry_date: "2027-05-19",
            certificate_url: "/api/chemical-document?type=svhc&product=DPP-AUDIO-DEMO-001",
            verification_status: "verified",
          },
        ],
    esg: data?.esg?.length
      ? data.esg
      : [
          {
            id: "demo-audio-esg-1",
            product_id: productId,
            carbon_footprint: 6.8,
            water_usage: 42,
            energy_consumption: 15.5,
            waste_generation: 0.22,
            recycled_content: 18,
            chemical_management: "RoHS, REACH SVHC, battery MSDS and supplier declarations reviewed.",
            lca_report_url: "/api/dpp-export?format=pdf&product=DPP-AUDIO-DEMO-001",
            methodology: "Screening LCA based on component BOM, battery data, assembly energy and export logistics assumptions.",
            verified_by: "SGS-CSTC Standards Technical Services Co., Ltd. (Demo)",
          },
        ],
    bom: data?.bom?.length
      ? data.bom
      : [
          {
            id: "demo-audio-bom-1",
            product_id: productId,
            component_name: "Wireless earbud main unit",
            component_name_zh: "无线耳机主体",
            component_type: "Electronic assembly",
            component_type_zh: "电子组件",
            quantity: 2,
            unit: "pcs",
            position: "Left / Right earbuds",
          },
          {
            id: "demo-audio-bom-2",
            product_id: productId,
            component_name: "Charging case",
            component_name_zh: "充电盒",
            component_type: "Battery-containing accessory",
            component_type_zh: "含电池配件",
            quantity: 1,
            unit: "pc",
            position: "Packaging set",
          },
          {
            id: "demo-audio-bom-3",
            product_id: productId,
            component_name: "USB-C charging cable",
            component_name_zh: "USB-C 充电线",
            component_type: "Accessory",
            component_type_zh: "配件",
            quantity: 1,
            unit: "pc",
            position: "Packaging set",
          },
        ],
    traceability: data?.traceability?.length
      ? data.traceability
      : [
          {
            id: "demo-audio-trace-1",
            product_id: productId,
            event_type: "component sourcing",
            event_name: "Battery and PCB components sourced",
            event_name_zh: "采购电池与 PCB 元件",
            event_date: "2026-04-16",
            country: "China",
            city: "Shenzhen",
            facility_name: "Demo Electronics Component Supplier",
            facility_name_zh: "示例电子元件供应商",
            transport_method: "Truck",
            verification_status: "verified",
            notes: "Supplier declarations, RoHS statement and battery MSDS linked.",
            notes_zh: "已关联供应商声明、RoHS 声明和电池 MSDS。",
          },
          {
            id: "demo-audio-trace-2",
            product_id: productId,
            event_type: "manufacturing",
            event_name: "Final assembly and acoustic QA",
            event_name_zh: "总装与声学质检",
            event_date: "2026-05-30",
            country: "China",
            city: "Dongguan",
            facility_name: "Demo Electronics Assembly Plant",
            facility_name_zh: "示例电子装配工厂",
            transport_method: "Internal transfer",
            verification_status: "verified",
            notes: "Batch QA and acoustic test records uploaded.",
            notes_zh: "已上传批次质检和声学测试记录。",
          },
          {
            id: "demo-audio-trace-3",
            product_id: productId,
            event_type: "transport",
            event_name: "Export shipment to EU importer",
            event_name_zh: "出口运输至欧盟进口商",
            event_date: "2026-06-02",
            country: "Germany",
            city: "Hamburg",
            facility_name: "Demo EU Importer Warehouse",
            facility_name_zh: "示例欧盟进口商仓库",
            transport_method: "Air freight + truck",
            verification_status: "pending",
            notes: "Carrier API connection reserved for future logistics updates.",
            notes_zh: "预留承运商 API 用于后续物流更新。",
          },
        ],
    circularity: data?.circularity?.length
      ? data.circularity
      : [
          {
            id: "demo-audio-circularity-1",
            product_id: productId,
            repairability_score: 64,
            recyclability_score: 58,
            take_back_program: "WEEE take-back through authorized electronics collection points.",
            resale_supported: true,
            remanufacturing_supported: false,
            disassembly_guide: "Remove silicone ear tips and separate charging case before recycling where possible.",
            recycling_instructions: "Send electronics and battery-containing parts to WEEE and battery collection streams.",
            end_of_life_info: "Do not dispose with household waste; use WEEE collection.",
          },
        ],
    consumerTransparency: data?.consumerTransparency?.length
      ? data.consumerTransparency
      : [
          {
            id: "demo-audio-consumer-1",
            product_id: productId,
            brand_story: "This demo shows how consumer electronics export data can become a public digital product passport.",
            brand_story_zh: "该示例展示如何将消费电子出口数据转化为公开数字产品护照。",
            sustainability_story: "Recycled plastic content, RoHS-screened components and WEEE instructions are disclosed for buyers and consumers.",
            sustainability_story_zh: "披露再生塑料成分、RoHS 筛查组件和 WEEE 指引，面向采购商和消费者透明展示。",
            consumer_notice: "Battery performance varies by use. Scan again before repair, resale or recycling for the latest product information.",
            consumer_notice_zh: "电池表现会随使用方式变化。维修、转售或回收前可再次扫码查看最新产品信息。",
            packaging_info: "FSC paper box with reduced plastic insert.",
          },
        ],
    digitalIdentity: data?.digitalIdentity?.length
      ? data.digitalIdentity
      : [
          {
            id: "demo-audio-identity-1",
            product_id: productId,
            product_uuid: "8a61f0d2-4f6a-4cf2-b11c-demoaudio01",
            gtin: "06900000000128",
            style_id: "STYLE-AUDIO-001",
            batch_id: "BATCH-AUDIO-2026-001",
            serial_id: "EARBUDS-DEMO-0001",
            digital_link_url: "https://www.greanlean.com/p/DPP-AUDIO-DEMO-001",
            qr_code_id: "QR-DPP-EARBUDS-001",
            nfc_id: "NFC-EARBUDS-001",
            rfid_epc: "RFID-RESERVED",
          },
        ],
    documents: data?.documents?.length
      ? data.documents
      : [
          {
            id: "demo-audio-document-1",
            product_id: productId,
            document_name: "EU Declaration of Conformity",
            document_type: "DoC",
            file_url: "/api/declaration?product=DPP-AUDIO-DEMO-001",
            file_size: "360 KB",
            language: "EN / ZH",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
          {
            id: "demo-audio-document-2",
            product_id: productId,
            document_name: "Battery MSDS",
            document_type: "MSDS",
            file_url: "/api/chemical-document?type=msds&product=DPP-AUDIO-DEMO-001",
            file_size: "480 KB",
            language: "EN",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
        ],
    governance: data?.governance?.length
      ? data.governance
      : [
          {
            id: "demo-audio-governance-1",
            product_id: productId,
            data_source: "Supplier declarations, RoHS/REACH reports, battery specification, QA records and logistics documents.",
            data_owner: "greanlean admin",
            audit_status:
              "Third-party review completed\nVerifier: SGS-CSTC Standards Technical Services Co., Ltd. (Demo)\nCertificate: SGS-DPP-AUDIO-2026-018\nValid until: 2027-06-03\nLast updated: 2026-06-04",
            data_quality_score: 88,
          },
        ],
  };
}

function withFlooringDppData(data?: any) {
  const productId = data?.product?.id || "demo-flooring-product";
  const product = {
    ...(data?.product || {}),
    id: productId,
    name: data?.product?.name || "WPC PLANK",
    name_zh: data?.product?.name_zh || "WPC PLANK",
    sku: data?.product?.sku || "MS140K25B",
    brand: data?.product?.brand || "HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD",
    category: data?.product?.category || "WPC DECKING",
    subcategory: data?.product?.subcategory || "Outdoor WPC Decking",
    season: data?.product?.season || "2026 Outdoor Decking Series",
    public_slug: data?.product?.public_slug || "demo-wpc-flooring",
    dpp_id: data?.product?.dpp_id || "DPP-WPC-MS140K25B",
    main_image: data?.product?.main_image || "/images/demo-wpc-flooring.svg",
    description:
      data?.product?.description ||
      "Outdoor composite decking board. Model MS140K25B, 140x25mm, 2.55kg/m, SANDING finish, colours WOOD / COFFEE / DARK GREY / LIGHT GREY, made in China by HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD.",
    description_zh:
      data?.product?.description_zh ||
      "户外木塑复合 decking 板材。型号 MS140K25B，规格 140x25mm，重量 2.55kg/m，表面工艺 SANDING，颜色 WOOD / COFFEE / DARK GREY / LIGHT GREY，中国制造，制造商 HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD。",
    care_instructions:
      data?.product?.care_instructions ||
      "Clean with neutral detergent and damp mop. Avoid long-term standing water, strong solvents and direct high-temperature exposure.",
    care_instructions_zh:
      data?.product?.care_instructions_zh ||
      "建议使用中性清洁剂和微湿拖布清洁。避免长期积水、强溶剂和高温直晒。",
    repair_instructions:
      data?.product?.repair_instructions ||
      "Replaceable decking panels. Use screw-and-clip disassembly where possible and keep spare planks from batch W2605-05 for colour matching.",
    repair_instructions_zh:
      data?.product?.repair_instructions_zh ||
      "地板板材可更换。建议采用螺丝与卡扣方式拆解，并保留 W2605-05 批次备用板以保证颜色一致。",
    end_of_life_instructions:
      data?.product?.end_of_life_instructions ||
      "Mechanical recycling is preferred. Avoid landfill, remove metal fasteners before recycling, and reprocess usable WPC material into composite products where facilities exist.",
    end_of_life_instructions_zh:
      data?.product?.end_of_life_instructions_zh ||
      "优先机械回收。避免填埋，回收前移除金属紧固件，具备条件时将可用 WPC 材料再加工为复合材料产品。",
  };

  return {
    product,
    materials: data?.materials?.length
      ? data.materials
      : [
          {
            id: "demo-floor-material-1",
            product_id: productId,
            material_name: "Wood Fiber",
            material_name_zh: "木纤维",
            material_type: "Raw Material",
            material_type_zh: "原材料",
            percentage: 60,
            recycled_content: 0,
            origin_country: "China",
            chemical_info: "Renewable wood-fibre content; supplier declared recyclable input material.",
            chemical_info_zh: "可再生木纤维成分；供应商声明为可回收投入材料。",
            recyclability: "Yes; recoverable in WPC composite stream where infrastructure exists",
            recyclability_zh: "是；具备条件时可进入 WPC 复合材料回收流",
            certification: "FSC Certificate BV-COC-154663 / Supplier: XXX Wood Supplier",
          },
          {
            id: "demo-floor-material-2",
            product_id: productId,
            material_name: "Recycled HDPE",
            material_name_zh: "再生 HDPE",
            material_type: "Raw Material",
            material_type_zh: "原材料",
            percentage: 30,
            recycled_content: 100,
            origin_country: "China",
            chemical_info: "REACH SVHC below 0.1% w/w; phthalates screened.",
            chemical_info_zh: "REACH SVHC 低于 0.1% w/w；已筛查邻苯二甲酸酯。",
            recyclability: "Yes; mechanical recycling after sorting and size reduction",
            recyclability_zh: "是；分选和破碎后可机械回收",
            certification: "Supplier: XXX Plastic Supplier",
          },
          {
            id: "demo-floor-material-3",
            product_id: productId,
            material_name: "Stabilizer Additives",
            material_name_zh: "稳定剂助剂",
            material_type: "Additive",
            material_type_zh: "添加剂",
            percentage: 7,
            recycled_content: 0,
            origin_country: "China",
            chemical_info: "Low-VOC stabilizers; no intentionally added lead, cadmium or hexavalent chromium.",
            chemical_info_zh: "采用低 VOC 稳定剂；未有意添加铅、镉或六价铬。",
            recyclability: "Partial; remains in composite recycling stream",
            recyclability_zh: "部分可回收；随复合材料整体进入回收流",
            certification: "Supplier: XXX Chemical Co.",
          },
          {
            id: "demo-floor-material-4",
            product_id: productId,
            material_name: "Brown Masterbatch",
            material_name_zh: "棕色色母粒",
            material_type: "Color Masterbatch",
            material_type_zh: "色母粒",
            percentage: 3,
            recycled_content: 0,
            origin_country: "China",
            chemical_info: "Colour masterbatch screened for heavy metals and restricted substances.",
            chemical_info_zh: "色母粒已筛查重金属和受限物质。",
            recyclability: "Partial; remains in composite recycling stream",
            recyclability_zh: "部分可回收；随复合材料整体进入回收流",
            certification: "Supplier: XXX Color Co.",
          },
          {
            id: "demo-floor-material-5",
            product_id: productId,
            material_name: "Pallet",
            material_name_zh: "托盘",
            material_type: "Packaging",
            material_type_zh: "包装",
            percentage: null,
            recycled_content: null,
            origin_country: "China",
            chemical_info: "Packaging component; recyclable wood pallet.",
            chemical_info_zh: "包装部件；木托盘可回收。",
            recyclability: "Yes",
            recyclability_zh: "是",
            certification: "Supplier: 泾县兴林木业有限公司",
          },
          {
            id: "demo-floor-material-6",
            product_id: productId,
            material_name: "Stainless Steel Clip And Screw with Narrow Gap (304)",
            material_name_zh: "304 不锈钢窄缝卡扣与螺丝",
            material_type: "Accessory",
            material_type_zh: "配件",
            percentage: null,
            recycled_content: null,
            origin_country: "China",
            chemical_info: "Metal fasteners should be removed before WPC recycling.",
            chemical_info_zh: "金属紧固件应在 WPC 回收前移除。",
            recyclability: "Yes",
            recyclability_zh: "是",
            certification: "Supplier: 南皮县珺成科技有限公司",
          },
        ],
    certificates: data?.certificates?.length
      ? data.certificates
      : [
          {
            id: "demo-floor-cert-1",
            product_id: productId,
            certificate_name: "EU Declaration of Performance",
            certificate_name_zh: "欧盟性能声明 DoP",
            certificate_type: "Construction products",
            certificate_type_zh: "建筑产品",
            certificate_number: "DOP-MS140K25B-W2605-05",
            issuer: "HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD",
            issue_date: "2026-06-04",
            expiry_date: "2027-06-03",
            certificate_url: "/api/declaration?product=DPP-WPC-MS140K25B",
            verification_status: "verified",
          },
          {
            id: "demo-floor-cert-2",
            product_id: productId,
            certificate_name: "VOC Test Report",
            certificate_name_zh: "VOC 检测报告",
            certificate_type: "Emission test",
            certificate_type_zh: "排放检测",
            certificate_number: "VOC-WPC-2026-018",
            issuer: "Demo Building Materials Testing Institute",
            issue_date: "2026-05-20",
            expiry_date: "2027-05-19",
            certificate_url: "/api/chemical-document?type=heavy-metals&product=DPP-WPC-MS140K25B",
            verification_status: "verified",
          },
          {
            id: "demo-floor-cert-3",
            product_id: productId,
            certificate_name: "REACH Declaration",
            certificate_name_zh: "REACH 声明",
            certificate_type: "Chemical compliance",
            certificate_type_zh: "化学合规",
            certificate_number: "REACH-WPC-2026-026",
            issuer: "Demo Chemical Testing Institute",
            issue_date: "2026-05-20",
            expiry_date: "2027-05-19",
            certificate_url: "/api/chemical-document?type=svhc&product=DPP-WPC-MS140K25B",
            verification_status: "verified",
          },
          {
            id: "demo-floor-cert-4",
            product_id: productId,
            certificate_name: "FSC Certificate",
            certificate_name_zh: "FSC 认证",
            certificate_type: "Chain of custody",
            certificate_type_zh: "产销监管链",
            certificate_number: "BV-COC-154663",
            issuer: "Bureau Veritas Certification (Demo)",
            issue_date: "2026-05-20",
            expiry_date: "2027-05-19",
            certificate_url: "/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B",
            verification_status: "verified",
          },
          {
            id: "demo-floor-cert-5",
            product_id: productId,
            certificate_name: "ISO9001 Certificate",
            certificate_name_zh: "ISO9001 认证",
            certificate_type: "Quality management",
            certificate_type_zh: "质量管理",
            certificate_number: "ISO9001-MS140K25B-DEMO",
            issuer: "Demo Quality Certification Body",
            issue_date: "2026-05-20",
            expiry_date: "2027-05-19",
            certificate_url: "/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B",
            verification_status: "verified",
          },
        ],
    esg: data?.esg?.length
      ? data.esg
      : [
          {
            id: "demo-floor-esg-1",
            product_id: productId,
            carbon_footprint: 12,
            water_usage: 120,
            energy_consumption: 15,
            waste_generation: 0.7,
            recycled_content: 30,
            chemical_management: "No SVHC declared; REACH declaration, VOC test and ISO14001/ISO9001 readiness captured. Carbon, electricity and water values use demo assumptions where Excel fields were blank.",
            lca_report_url: "/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B",
            methodology: "Estimated screening profile: 12 kg CO2e/m2, 15 kWh electricity, 120 L water, 30% renewable-energy ratio and 70% waste recycling rate; based on WPC decking industry assumptions and supplied product data.",
            verified_by: "Greanlean demo data review",
          },
        ],
    bom: data?.bom?.length
      ? data.bom
      : [
          {
            id: "demo-floor-bom-1",
            product_id: productId,
            component_name: "WPC PLANK MS140K25B",
            component_name_zh: "WPC PLANK MS140K25B",
            component_type: "Outdoor composite decking board",
            component_type_zh: "户外木塑复合 decking 板",
            quantity: 1,
            unit: "2.55kg/m",
            position: "140x25mm; SANDING; WOOD / COFFEE / DARK GREY / LIGHT GREY",
          },
          {
            id: "demo-floor-bom-2",
            product_id: productId,
            component_name: "Pallet",
            component_name_zh: "托盘",
            component_type: "Packaging",
            component_type_zh: "包装",
            quantity: 1,
            unit: "set",
            position: "Supplier: 泾县兴林木业有限公司",
          },
          {
            id: "demo-floor-bom-3",
            product_id: productId,
            component_name: "Stainless Steel Clip And Screw with Narrow Gap (304)",
            component_name_zh: "304 不锈钢窄缝卡扣与螺丝",
            component_type: "Accessory",
            component_type_zh: "配件",
            quantity: 1,
            unit: "set",
            position: "Supplier: 南皮县珺成科技有限公司",
          },
        ],
    traceability: data?.traceability?.length
      ? data.traceability
      : [
          {
            id: "demo-floor-trace-1",
            product_id: productId,
            event_type: "material sourcing",
            event_name: "Wood fiber, recycled HDPE and additive suppliers confirmed",
            event_name_zh: "确认木纤维、再生 HDPE 与助剂供应商",
            event_date: "2026-04-20",
            country: "China",
            city: "Anhui / Hebei",
            facility_name: "XXX Wood Supplier; XXX Plastic Supplier; XXX Chemical Co.; XXX Color Co.",
            facility_name_zh: "XXX Wood Supplier；XXX Plastic Supplier；XXX Chemical Co.；XXX Color Co.",
            transport_method: "Truck",
            verification_status: "verified",
            notes: "Material suppliers listed from Excel template; REACH and FSC evidence linked where available.",
            notes_zh: "材料供应商来自 Excel 模板；已关联 REACH 与 FSC 证据。",
          },
          {
            id: "demo-floor-trace-2",
            product_id: productId,
            event_type: "manufacturing",
            event_name: "Production start: extrusion, sanding and profile finishing",
            event_name_zh: "生产开始：挤出、砂光与型材加工",
            event_date: "2026-05-01",
            country: "China",
            city: "Huangshan",
            facility_name: "HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD",
            facility_name_zh: "HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD",
            transport_method: "Internal transfer",
            verification_status: "verified",
            notes: "Production window: 2026-05-01 to 2026-05-03. Product dimensions 140x25mm; weight 2.55kg/m; surface finish SANDING.",
            notes_zh: "生产区间：2026-05-01 至 2026-05-03。产品规格 140x25mm；重量 2.55kg/m；表面工艺 SANDING。",
          },
          {
            id: "demo-floor-trace-3",
            product_id: productId,
            event_type: "quality inspection",
            event_name: "Quality inspection and batch release",
            event_name_zh: "质量检测与批次放行",
            event_date: "2026-05-20",
            country: "China",
            city: "Huangshan",
            facility_name: "HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD",
            facility_name_zh: "HUANGSHAN MEISEN NEW MATERIAL TECHNOLOGY CO., LTD",
            transport_method: "Internal transfer",
            verification_status: "verified",
            notes: "Quality inspection passed. Batch/Lot Number: W2605-05. Traceability Code: TRACE-W2605-05.",
            notes_zh: "质量检测通过。批次号：W2605-05。追溯编码：TRACE-W2605-05。",
          },
          {
            id: "demo-floor-trace-4",
            product_id: productId,
            event_type: "transport",
            event_name: "Export shipment to EU distributor",
            event_name_zh: "出口运输至欧盟经销商",
            event_date: "2026-06-01",
            country: "Netherlands",
            city: "Rotterdam",
            facility_name: "Demo EU Building Materials Distributor",
            facility_name_zh: "示例欧盟建材经销仓",
            transport_method: "Sea freight + truck",
            verification_status: "pending",
            notes: "Carrier data reserved for future API connection.",
            notes_zh: "运输数据预留给后续承运商 API 对接。",
          },
        ],
    circularity: data?.circularity?.length
      ? data.circularity
      : [
          {
            id: "demo-floor-circularity-1",
            product_id: productId,
            repairability_score: 70,
            recyclability_score: 82,
            take_back_program: "Mechanical recycling through installer take-back or construction-waste recovery channels where available.",
            resale_supported: true,
            remanufacturing_supported: true,
            disassembly_guide: "Mechanical / screw-and-clip disassembly. Remove stainless steel clips and screws before recycling.",
            recycling_instructions: "Mechanical Recycling. Reprocess into composite material; avoid landfill and avoid mixing with PVC flooring waste.",
            end_of_life_info: "Avoid landfill. Reuse intact planks first, remove metal fasteners, then send WPC material to composite-material recycling.",
          },
        ],
    consumerTransparency: data?.consumerTransparency?.length
      ? data.consumerTransparency
      : [
          {
            id: "demo-floor-consumer-1",
            product_id: productId,
            brand_story: "This demo shows how building-material product data can be structured into a digital product passport for EU buyers and installers.",
            brand_story_zh: "该示例展示如何将建材产品数据结构化为面向欧盟买家和安装商的数字产品护照。",
            sustainability_story: "60% wood fiber, 30% recycled HDPE, FSC evidence, VOC evidence and mechanical recycling instructions are disclosed in this DPP.",
            sustainability_story_zh: "本 DPP 披露 60% 木纤维、30% 再生 HDPE、FSC 证据、VOC 证据和机械回收指引。",
            consumer_notice: "Colour options include WOOD, COFFEE, DARK GREY and LIGHT GREY. Keep spare planks from batch W2605-05 for repair and scan before reuse or recycling.",
            consumer_notice_zh: "颜色包括 WOOD、COFFEE、DARK GREY 和 LIGHT GREY。建议保留 W2605-05 批次备用板，维修、再使用或回收前扫码查看最新信息。",
            packaging_info: "Recyclable pallet supplied by 泾县兴林木业有限公司; remove pallet and metal accessories before WPC recycling.",
          },
        ],
    digitalIdentity: data?.digitalIdentity?.length
      ? data.digitalIdentity
      : [
          {
            id: "demo-floor-identity-1",
            product_id: productId,
            product_uuid: "51e0f9f3-3c7b-45c0-9b8f-demofloor01",
            gtin: "06900000000203",
            style_id: "STYLE-WPC-MS140K25B",
            batch_id: "W2605-05",
            serial_id: "TRACE-W2605-05",
            digital_link_url: "https://www.greanlean.com/p/DPP-WPC-MS140K25B",
            qr_code_id: "QR-DPP-WPC-001",
            nfc_id: "NFC-RESERVED",
            rfid_epc: "RFID-PALLET-RESERVED",
          },
        ],
    documents: data?.documents?.length
      ? data.documents
      : [
          {
            id: "demo-floor-document-1",
            product_id: productId,
            document_name: "EU Declaration of Performance",
            document_type: "DoP",
            file_url: "/api/declaration?product=DPP-WPC-MS140K25B",
            file_size: "390 KB",
            language: "EN / ZH",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
          {
            id: "demo-floor-document-2",
            product_id: productId,
            document_name: "VOC Test Report",
            document_type: "VOC",
            file_url: "/api/chemical-document?type=heavy-metals&product=DPP-WPC-MS140K25B",
            file_size: "520 KB",
            language: "EN",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
          {
            id: "demo-floor-document-3",
            product_id: productId,
            document_name: "FSC Certificate",
            document_type: "FSC",
            file_url: "/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B",
            file_size: "420 KB",
            language: "EN",
            uploaded_by: "greanlean admin",
            version: "BV-COC-154663",
          },
          {
            id: "demo-floor-document-4",
            product_id: productId,
            document_name: "REACH Declaration",
            document_type: "REACH",
            file_url: "/api/chemical-document?type=svhc&product=DPP-WPC-MS140K25B",
            file_size: "410 KB",
            language: "EN",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
          {
            id: "demo-floor-document-5",
            product_id: productId,
            document_name: "ISO9001 Certificate",
            document_type: "ISO9001",
            file_url: "/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B",
            file_size: "440 KB",
            language: "EN",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
          {
            id: "demo-floor-document-6",
            product_id: productId,
            document_name: "Installation Guide",
            document_type: "Installation",
            file_url: "/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B",
            file_size: "310 KB",
            language: "EN / ZH",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
          {
            id: "demo-floor-document-7",
            product_id: productId,
            document_name: "Warranty Document",
            document_type: "Warranty",
            file_url: "/api/dpp-export?format=pdf&product=DPP-WPC-MS140K25B",
            file_size: "260 KB",
            language: "EN / ZH",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
        ],
    governance: data?.governance?.length
      ? data.governance
      : [
          {
            id: "demo-floor-governance-1",
            product_id: productId,
            data_source: "地板DPP.xlsx, supplier declarations, FSC certificate BV-COC-154663, REACH declaration, VOC report, ISO9001 certificate, installation guide and warranty document.",
            data_owner: "greanlean admin",
            audit_status:
              "Demo review completed\nVerifier: Greanlean demo data review\nCertificate: DPP-WPC-MS140K25B\nBatch/Lot: W2605-05\nEstimated fields: carbon footprint, electricity, water, renewable energy ratio, waste recycling rate and ISO14001 readiness\nLast updated: 2026-06-07",
            data_quality_score: 90,
          },
        ],
  };
}

function withFurnitureDppData(data?: any) {
  const productId = data?.product?.id || "demo-furniture-product";
  const product = {
    ...(data?.product || {}),
    id: productId,
    name: data?.product?.name || "Disassemblable Ergonomic Office Chair",
    name_zh: data?.product?.name_zh || "可拆解人体工学办公椅",
    sku: data?.product?.sku || "GL-CHAIR-001",
    brand: data?.product?.brand || "greanlean",
    category: data?.product?.category || "Furniture",
    subcategory: data?.product?.subcategory || "Office Chair",
    season: data?.product?.season || "2026 EU Furniture Demo",
    public_slug: data?.product?.public_slug || "demo-office-chair",
    dpp_id: data?.product?.dpp_id || "DPP-FURN-DEMO-001",
    main_image: data?.product?.main_image || "/images/demo-office-chair.svg",
    description:
      data?.product?.description ||
      "A furniture digital product passport demo for EU exports, covering material composition, recycled content, durability testing, repairability, disassembly and end-of-life recovery.",
    description_zh:
      data?.product?.description_zh ||
      "面向出口欧盟家具产品的数字产品护照示例，覆盖材料组成、再生成分、耐久性测试、可维修性、拆解和生命周期结束回收路径。",
    care_instructions:
      data?.product?.care_instructions ||
      "Wipe frame with a damp cloth. Vacuum mesh regularly. Avoid direct sunlight, corrosive cleaners and overload beyond rated capacity.",
    care_instructions_zh:
      data?.product?.care_instructions_zh ||
      "金属框架可用微湿布清洁，网布建议定期吸尘。避免长期日晒、腐蚀性清洁剂和超额承重。",
    repair_instructions:
      data?.product?.repair_instructions ||
      "Seat cushion, armrest pads, castors and gas lift are replaceable modules. Use compatible spare parts and keep fasteners sorted during repair.",
    repair_instructions_zh:
      data?.product?.repair_instructions_zh ||
      "坐垫、扶手垫、脚轮和气压杆为可更换模块。维修时使用兼容备件，并分类保存紧固件。",
    end_of_life_instructions:
      data?.product?.end_of_life_instructions ||
      "Disassemble metal frame, plastic parts, textile mesh and foam before recycling where possible. Reuse intact components through furniture refurbishment channels first.",
    end_of_life_instructions_zh:
      data?.product?.end_of_life_instructions_zh ||
      "回收前尽量拆分金属框架、塑料件、网布和海绵。完好部件优先进入家具翻新或再使用渠道。",
  };

  return {
    product,
    materials: data?.materials?.length
      ? data.materials
      : [
          {
            id: "demo-chair-material-1",
            product_id: productId,
            material_name: "Powder-coated steel frame",
            material_name_zh: "粉末喷涂钢制框架",
            material_type: "Metal",
            material_type_zh: "金属",
            percentage: 42,
            recycled_content: 35,
            origin_country: "China",
            chemical_info: "REACH SVHC screened; coating tested for lead, cadmium and hexavalent chromium.",
            chemical_info_zh: "已筛查 REACH SVHC；涂层检测铅、镉和六价铬。",
            recyclability: "Separable steel recycling stream",
            recyclability_zh: "可拆解进入钢材回收流",
            certification: "REACH / heavy metal screening",
          },
          {
            id: "demo-chair-material-2",
            product_id: productId,
            material_name: "Recycled PP / PA plastic parts",
            material_name_zh: "再生 PP / PA 塑料件",
            material_type: "Polymer",
            material_type_zh: "聚合物",
            percentage: 28,
            recycled_content: 45,
            origin_country: "China",
            chemical_info: "Phthalates and flame-retardant screening completed.",
            chemical_info_zh: "已完成邻苯二甲酸酯和阻燃剂筛查。",
            recyclability: "Mechanical recycling after sorting by polymer type",
            recyclability_zh: "按聚合物类型分选后可机械回收",
            certification: "GRS supplier declaration (Demo)",
          },
          {
            id: "demo-chair-material-3",
            product_id: productId,
            material_name: "Polyester mesh and PU foam",
            material_name_zh: "涤纶网布与 PU 海绵",
            material_type: "Textile / foam",
            material_type_zh: "纺织 / 海绵",
            percentage: 30,
            recycled_content: 18,
            origin_country: "China",
            chemical_info: "Skin-contact textile screened against REACH and OEKO-TEX substance requirements.",
            chemical_info_zh: "接触皮肤纺织材料按 REACH 和 OEKO-TEX 物质要求筛查。",
            recyclability: "Reuse or textile/foam recovery where local facilities exist",
            recyclability_zh: "具备设施时可再使用或进入纺织/海绵回收",
            certification: "OEKO-TEX supplier declaration (Demo)",
          },
        ],
    certificates: data?.certificates?.length
      ? data.certificates
      : [
          {
            id: "demo-chair-cert-1",
            product_id: productId,
            certificate_name: "Furniture Durability Test Report",
            certificate_name_zh: "家具耐久性测试报告",
            certificate_type: "Performance",
            certificate_type_zh: "性能测试",
            certificate_number: "EN1335-CHAIR-2026-011",
            issuer: "Demo Furniture Testing Institute",
            issue_date: "2026-05-16",
            expiry_date: "2027-05-15",
            certificate_url: "/api/dpp-export?format=pdf&product=DPP-FURN-DEMO-001",
            verification_status: "verified",
          },
          {
            id: "demo-chair-cert-2",
            product_id: productId,
            certificate_name: "REACH SVHC and Heavy Metal Screening",
            certificate_name_zh: "REACH SVHC 与重金属筛查",
            certificate_type: "Chemical compliance",
            certificate_type_zh: "化学合规",
            certificate_number: "REACH-FURN-2026-024",
            issuer: "Demo Chemical Testing Institute",
            issue_date: "2026-05-20",
            expiry_date: "2027-05-19",
            certificate_url: "/api/chemical-document?type=svhc&product=DPP-FURN-DEMO-001",
            verification_status: "verified",
          },
        ],
    esg: data?.esg?.length
      ? data.esg
      : [
          {
            id: "demo-chair-esg-1",
            product_id: productId,
            carbon_footprint: 28.6,
            water_usage: 76,
            energy_consumption: 58,
            waste_generation: 1.4,
            recycled_content: 34,
            chemical_management: "REACH SVHC, coating heavy metals, textile contact materials and foam additives reviewed.",
            lca_report_url: "/api/dpp-export?format=pdf&product=DPP-FURN-DEMO-001",
            methodology: "Screening LCA based on steel frame, polymer content, upholstery, assembly energy and sea freight to the EU.",
            verified_by: "Demo Furniture Testing Institute",
          },
        ],
    bom: data?.bom?.length
      ? data.bom
      : [
          { id: "demo-chair-bom-1", product_id: productId, component_name: "Steel base and frame", component_name_zh: "钢制底座与框架", component_type: "Structural part", component_type_zh: "结构件", quantity: 1, unit: "set", position: "Base / back frame" },
          { id: "demo-chair-bom-2", product_id: productId, component_name: "Seat cushion module", component_name_zh: "坐垫模块", component_type: "Replaceable module", component_type_zh: "可更换模块", quantity: 1, unit: "pc", position: "Seat" },
          { id: "demo-chair-bom-3", product_id: productId, component_name: "Armrest and castor kit", component_name_zh: "扶手与脚轮套件", component_type: "Spare-part kit", component_type_zh: "备件套件", quantity: 1, unit: "set", position: "Side / base" },
        ],
    traceability: data?.traceability?.length
      ? data.traceability
      : [
          {
            id: "demo-chair-trace-1",
            product_id: productId,
            event_type: "material sourcing",
            event_name: "Steel tube, recycled plastic and mesh sourced",
            event_name_zh: "采购钢管、再生塑料与网布",
            event_date: "2026-04-12",
            country: "China",
            city: "Foshan",
            facility_name: "Demo Furniture Materials Supplier",
            facility_name_zh: "示例家具材料供应商",
            transport_method: "Truck",
            verification_status: "verified",
            notes: "Supplier declarations, recycled-content statement and REACH screening linked.",
            notes_zh: "已关联供应商声明、再生成分声明和 REACH 筛查。",
          },
          {
            id: "demo-chair-trace-2",
            product_id: productId,
            event_type: "manufacturing",
            event_name: "Frame welding, upholstery and final assembly",
            event_name_zh: "框架焊接、软包与总装",
            event_date: "2026-05-22",
            country: "China",
            city: "Anji",
            facility_name: "Demo Office Furniture Factory",
            facility_name_zh: "示例办公家具工厂",
            transport_method: "Internal transfer",
            verification_status: "verified",
            notes: "Batch production, torque check and durability sample test uploaded.",
            notes_zh: "已上传批次生产、扭矩检查和耐久性抽检记录。",
          },
          {
            id: "demo-chair-trace-3",
            product_id: productId,
            event_type: "transport",
            event_name: "Export shipment to EU furniture distributor",
            event_name_zh: "出口运输至欧盟家具经销商",
            event_date: "2026-06-03",
            country: "Netherlands",
            city: "Rotterdam",
            facility_name: "Demo EU Furniture Distributor",
            facility_name_zh: "示例欧盟家具经销仓",
            transport_method: "Sea freight + truck",
            verification_status: "pending",
            notes: "Shipment and warehouse data reserved for future logistics API connection.",
            notes_zh: "运输和仓储数据预留给后续物流 API 对接。",
          },
        ],
    circularity: data?.circularity?.length
      ? data.circularity
      : [
          {
            id: "demo-chair-circularity-1",
            product_id: productId,
            repairability_score: 82,
            recyclability_score: 78,
            take_back_program: "Eligible for office furniture refurbishment and parts harvesting pilot.",
            resale_supported: true,
            remanufacturing_supported: true,
            disassembly_guide: "Remove castors, armrests, gas lift, seat cushion and back mesh before separating metal and plastic streams.",
            recycling_instructions: "Prioritize reuse and refurbishment; recycle steel frame, sorted plastics and textile/foam through authorized channels.",
            end_of_life_info: "Do not dispose as mixed waste where bulky-waste or furniture recovery services are available.",
          },
        ],
    consumerTransparency: data?.consumerTransparency?.length
      ? data.consumerTransparency
      : [
          {
            id: "demo-chair-consumer-1",
            product_id: productId,
            brand_story: "This demo shows how furniture data can be organized into a repairable and reusable product passport.",
            brand_story_zh: "该示例展示如何将家具数据组织成支持维修和再使用的数字产品护照。",
            sustainability_story: "Recycled metal and plastic content, replaceable modules and disassembly instructions are disclosed.",
            sustainability_story_zh: "披露再生金属和塑料含量、可更换模块和拆解说明。",
            consumer_notice: "Check fasteners periodically. Scan before resale, repair or bulky-waste collection for the latest product information.",
            consumer_notice_zh: "建议定期检查紧固件。转售、维修或大件回收前可扫码查看最新产品信息。",
            packaging_info: "Flat-pack cardboard carton with reduced EPS foam and reusable parts bag.",
          },
        ],
    digitalIdentity: data?.digitalIdentity?.length
      ? data.digitalIdentity
      : [
          {
            id: "demo-chair-identity-1",
            product_id: productId,
            product_uuid: "e01b59d5-0f1f-4a7d-a25d-demochair01",
            gtin: "06900000000302",
            style_id: "STYLE-FURN-CHAIR-001",
            batch_id: "BATCH-FURN-2026-001",
            serial_id: "CHAIR-DEMO-0001",
            digital_link_url: "https://www.greanlean.com/p/DPP-FURN-DEMO-001",
            qr_code_id: "QR-DPP-CHAIR-001",
            nfc_id: "NFC-CHAIR-RESERVED",
            rfid_epc: "RFID-CARTON-RESERVED",
          },
        ],
    documents: data?.documents?.length
      ? data.documents
      : [
          {
            id: "demo-chair-document-1",
            product_id: productId,
            document_name: "Furniture Durability Test Report",
            document_type: "Performance",
            file_url: "/api/dpp-export?format=pdf&product=DPP-FURN-DEMO-001",
            file_size: "510 KB",
            language: "EN / ZH",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
          {
            id: "demo-chair-document-2",
            product_id: productId,
            document_name: "REACH SVHC Screening Report",
            document_type: "Chemical",
            file_url: "/api/chemical-document?type=svhc&product=DPP-FURN-DEMO-001",
            file_size: "460 KB",
            language: "EN",
            uploaded_by: "greanlean admin",
            version: "v1.0",
          },
        ],
    governance: data?.governance?.length
      ? data.governance
      : [
          {
            id: "demo-chair-governance-1",
            product_id: productId,
            data_source: "Supplier declarations, recycled-content statements, durability reports, production batch records, packaging data and logistics documents.",
            data_owner: "greanlean admin",
            audit_status:
              "Demo review completed\nVerifier: Demo Furniture Testing Institute\nCertificate: DPP-FURN-2026-021\nValid until: 2027-06-03\nLast updated: 2026-06-06",
            data_quality_score: 89,
          },
        ],
  };
}

export default async function PublicDppPage({ params, searchParams }: { params: { slug: string }; searchParams?: { view?: string; lang?: string } }) {
  const data = await getData(params.slug);
  if (!data) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const query = new URLSearchParams();
  if (searchParams?.view === "simple" || searchParams?.view === "detail") query.set("view", searchParams.view);
  if (searchParams?.lang === "zh" || searchParams?.lang === "en") query.set("lang", searchParams.lang);
  const publicId = encodeURIComponent(data.product.dpp_id || data.product.public_slug);
  const dppUrl = `${site}/p/${publicId}${query.toString() ? `?${query.toString()}` : ""}`;
  return <PublicDppClient data={data} dppUrl={dppUrl} />;
}
