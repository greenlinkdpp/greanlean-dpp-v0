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
  if (!product) {
    if (slug === "demo-wireless-earbuds") return withElectronicsDppData();
    return null;
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

  if (slug === "demo-organic-cotton-tshirt") {
    return withDemoDppData(data);
  }

  if (slug === "demo-wireless-earbuds") {
    return withElectronicsDppData(data);
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

function withElectronicsDppData(data?: any) {
  const productId = data?.product?.id || "demo-electronics-product";
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
    main_image: data?.product?.main_image || "/images/demo-wireless-earbuds.svg",
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
            issue_date: "2026-06-04",
            expiry_date: "2027-06-03",
            certificate_url: "https://example.com/earbuds-eu-doc.pdf",
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
            certificate_url: "https://example.com/earbuds-rohs-report.pdf",
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
            certificate_url: "https://example.com/earbuds-reach-svhc.pdf",
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
            lca_report_url: "https://example.com/earbuds-lca-summary.pdf",
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
            digital_link_url: "https://www.greanlean.com/p/demo-wireless-earbuds",
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
            file_url: "https://example.com/earbuds-eu-doc.pdf",
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
            file_url: "https://example.com/earbuds-battery-msds.pdf",
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

export default async function PublicDppPage({ params }: { params: { slug: string } }) {
  const data = await getData(params.slug);
  if (!data) notFound();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const dppUrl = `${site}/p/${data.product.public_slug}`;
  return <PublicDppClient data={data} dppUrl={dppUrl} />;
}
