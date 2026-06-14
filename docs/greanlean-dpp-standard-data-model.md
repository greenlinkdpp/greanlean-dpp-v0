# GreanLean DPP 标准数据模型

版本：v0.1  
适用范围：客户信息收集表、Supabase 数据库、后台录入、公开 DPP 页面、JSON 导出、API 返回。

## 设计原则

- `DPP ID` 是公开 DPP 页面和 API 查询的主标识，例如 `/p/DPP-WPC-MS140K25B`。
- `SKU` 是客户导入和后台录入时的产品匹配键。
- `product_id` 是 Supabase 内部关联键，不对客户暴露。
- 客户收集表字段使用业务语言，Supabase 字段使用稳定英文命名。
- DPP 页面只展示对买家、监管、消费者有意义的信息；内部字段可保留但不全部展示。
- JSON/API 字段应稳定、可对接，避免直接暴露数据库表结构细节。

## 模块总览

| 模块 | 客户收集表 | Supabase 表 | 后台录入 | DPP 页面 | JSON/API |
|---|---|---|---|---|---|
| 客户与线索 | 客户联系信息 | `leads` | 客户提交 | 不展示 | 可作为 CRM API |
| 产品基本信息 | Products | `products` | 产品基础信息 | 产品基本信息 / 总览 | `product` |
| 数字身份 | DigitalIdentity | `product_digital_identity` | 数字身份 | 总览 / 产品身份 | `identity` |
| 供应商 | Suppliers | `product_suppliers`, `supplier_products` | 供应商库 | 供应链 / 证据 | `suppliers` |
| 生命周期与版本 | LifecycleVersioning | `products`, `product_versions` | 生命周期 / 版本历史 | 顶部状态 / 数据治理 | `product.status`, `product.current_version`, `version_history` |
| 材料组成 | Materials | `product_materials` | 材料 | 材料组成与来源 | `materials` |
| 组件/包装/辅料 | BOM | `product_bom` | 组件 / BOM | 组件、包装与辅料 | `bom` |
| 化学与受限物质 | ChemicalCompliance | 当前由页面模型/API 文件生成，建议独立表 | 暂未独立 | 化学品与受限物质 | `chemical_compliance` |
| 产品性能 | ProductPerformance | 当前由页面模型生成，建议独立表 | 暂未独立 | 产品性能 | `performance` |
| 生产运输追溯 | Traceability | `product_traceability` | 供应链追踪 | 生产与运输追溯 | `traceability` |
| ESG 与循环 | ESG, Circularity | `product_esg_metrics`, `product_circularity` | ESG / 循环性 | ESG 与循环性 / End of Life | `esg`, `circularity` |
| 证书与文件 | Certificates, Documents | `product_certificates`, `product_documents` | 证书 / 文档 | 认证证书 / 证据文件 | `certificates`, `documents` |
| 数据治理 | DataGovernance | `product_data_governance` | 数据治理 | 证据文件与数据治理 | `governance` |

## 1. 客户信息收集表字段

用于官网表单、销售跟进和初步判断客户 DPP 准备度。

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台字段 | DPP 页面 | JSON/API |
|---|---|---|---|---|---|
| 联系人姓名 | 姓名 / 称呼 | `leads.name` | 客户提交 / 姓名 | 不展示 | `lead.name` |
| 公司名称 | 公司名称 | `leads.company` | 客户提交 / 公司 | 不展示 | `lead.company` |
| 联系方式 | 手机 / 邮箱 / WhatsApp / 微信 | `leads.contact` | 客户提交 / 联系方式 | 不展示 | `lead.contact` |
| 行业 | 行业 / 产品类别 | `leads.industry` | 客户提交 / 行业 | 不展示 | `lead.industry` |
| 需求描述 | 产品、出口市场、资料情况 | `leads.message` | 客户提交 / 留言 | 不展示 | `lead.message` |
| 跟进状态 | 内部状态 | `leads.status` | 新线索 / 已联系 / 已关闭 | 不展示 | `lead.status` |
| 来源 | 提交来源 | `leads.source` | 来源 | 不展示 | `lead.source` |
| 提交时间 | 自动生成 | `leads.created_at` | 提交时间 | 不展示 | `lead.created_at` |

## 2. 产品基本信息

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 产品英文名 | Product name EN | `products.name` | Product name (English) | 标题 / 产品基本信息 | `product.name` |
| 产品中文名 | Product name ZH | `products.name_zh` | 产品名称（中文） | 标题 / 产品基本信息 | `product.name_zh` |
| SKU / 型号 | SKU / Model | `products.sku` | SKU | 总览 / 产品基本信息 | `product.sku` |
| 品牌 | Brand | `products.brand` | 品牌 | 产品基本信息 | `product.brand` |
| 分类 | Category | `products.category` | 分类 | 总览标签 / 产品基本信息 | `product.category` |
| 子分类 | Subcategory | `products.subcategory` | 子分类 | 产品基本信息 | `product.subcategory` |
| 系列 / 季节 | Season / Collection | `products.season` | 季节 / 系列 | 产品基本信息 | `product.season` |
| 英文描述 | Description EN | `products.description` | 描述（英文） | 视页面需要展示 | `product.description` |
| 中文描述 | Description ZH | `products.description_zh` | 描述（中文） | 视页面需要展示 | `product.description_zh` |
| 产品主图 | Main image URL | `products.main_image` | 主图 URL | 总览产品图片 | `product.main_image` |
| DPP ID | DPP ID | `products.dpp_id` | 自动/手动维护 | URL / 总览 / 产品身份 | `product.dpp_id` |
| 公开 Slug | Public slug | `products.public_slug` | 公开 Slug | 旧链接兼容 | `product.slug` |
| 发布状态 | Status | `products.status` | 草稿 / 待审核 / 已发布 / 已更新 / 已归档 / 证书过期 | 顶部状态 | `product.status` |
| 当前版本 | Current version | `products.current_version` | 当前版本 | 顶部状态 / 数据治理 | `product.current_version` |
| 护理说明 | Care instructions | `products.care_instructions`, `products.care_instructions_zh` | 护理说明 | 消费者说明 / End of Life | `product.care_instructions` |
| 维修说明 | Repair instructions | `products.repair_instructions`, `products.repair_instructions_zh` | 维修说明 | 消费者说明 / End of Life | `product.repair_instructions` |
| 生命周期结束说明 | End-of-life instructions | `products.end_of_life_instructions`, `products.end_of_life_instructions_zh` | 生命周期结束说明 | End of Life | `product.end_of_life_instructions` |
| 更新时间 | Last updated | `products.updated_at` | 自动生成 | 总览 / 数据治理 | `product.updated_at`, `last_updated` |

## 3. 数字身份与数据载体

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 产品 UUID | Product UUID | `product_digital_identity.product_uuid` | 产品 UUID | 详细身份 | `identity.product_uuid` |
| GTIN | GTIN | `product_digital_identity.gtin` | GTIN | 总览 / 产品身份 | `identity.gtin` |
| SGTIN / 单品序列 | GTIN + Serial ID | 由 `gtin` + `serial_id` 生成 | 序列号 | 总览 / 产品身份 | `identity.sgtin` |
| Style ID | Style ID | `product_digital_identity.style_id` | 款式 ID | 产品身份 | `identity.style_id` |
| 批次号 | Batch ID | `product_digital_identity.batch_id` | 批次 ID | 总览 / 产品身份 | `identity.batch_id` |
| 序列号 | Serial ID | `product_digital_identity.serial_id` | 序列号 | 产品身份 | `identity.serial_id` |
| 数字链接 | Digital link URL | `product_digital_identity.digital_link_url` | 数字链接 URL | 产品身份 / 二维码 | `identity.digital_link_url` |
| QR ID | QR code ID | `product_digital_identity.qr_code_id` | 二维码 ID | 二维码 | `identity.qr_code_id` |
| NFC ID | NFC ID | `product_digital_identity.nfc_id` | NFC ID | 数据载体 | `identity.nfc_id` |
| RFID EPC | RFID EPC | `product_digital_identity.rfid_epc` | RFID EPC | 数据载体 | `identity.rfid_epc` |

## 4. 供应商与产品关联

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 供应商名称 | Supplier name | `product_suppliers.supplier_name` | 供应商名称 | 供应链 / 材料来源 | `suppliers[].name` |
| 供应商类型 | Supplier type | `product_suppliers.supplier_type` | 供应商类型 | 供应商类型 | `suppliers[].type` |
| 国家 | Country | `product_suppliers.country` | 国家 | 供应链地点 | `suppliers[].country` |
| 城市 | City | `product_suppliers.city` | 城市 | 供应链地点 | `suppliers[].city` |
| 联系人 | Contact person | `product_suppliers.contact_person` | 联系人 | 通常不公开 | `suppliers[].contact_person` |
| 邮箱 | Email | `product_suppliers.email` | 邮箱 | 通常不公开 | `suppliers[].email` |
| 供应商证书 | Certifications | `product_suppliers.certifications` | 认证 | 证据链摘要 | `suppliers[].certifications` |
| ESG 评分 | ESG score | `product_suppliers.esg_score` | ESG 评分 | 可选展示 | `suppliers[].esg_score` |
| 工厂名称 | Facility name | `product_suppliers.facility_name`, `facility_name_zh` | 设施名称 | 追溯事件 | `suppliers[].facility_name` |
| 经纬度 | Latitude / Longitude | `latitude`, `longitude` | 经纬度 | 地图预留 | `suppliers[].location` |
| 供应商角色 | Supplier role | `supplier_products.supplier_role` | 供应商关联产品 / 角色 | 供应链角色 | `supplier_product_links[].role` |
| 关联状态 | Relationship status | `supplier_products.relationship_status` | 合作中 / 暂停 | 内部或可选展示 | `supplier_product_links[].status` |
| 关联备注 | Notes | `supplier_products.notes`, `notes_zh` | 备注 | 可选展示 | `supplier_product_links[].notes` |

## 5. 生命周期与版本管理

产品生命周期状态：

| 状态 | 中文 | 是否公开访问 | 使用场景 |
|---|---|---|---|
| `draft` | 草稿 | 否 | 产品资料录入中 |
| `review` | 待审核 | 否 | 等待内部或客户确认 |
| `published` | 已发布 | 是 | 初始公开版本 |
| `updated` | 已更新 | 是 | 已发布后有资料变更 |
| `archived` | 已归档 | 否 | 产品下架或不再公开 |
| `expired` | 证书过期 | 是 | 页面仍可访问，但提示证书/资料需更新 |

版本记录写入 `product_versions`，每次保存产品时记录当前状态、版本号、变更类型和快照。

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 版本号 | Version | `product_versions.version` | 本次保存版本号 | 数据治理 / 版本历史 | `version_history[].version` |
| 生命周期状态 | Lifecycle status | `lifecycle_status` | 生命周期状态 | 顶部状态 | `version_history[].lifecycle_status` |
| 变更类型 | Change type | `change_type` | 初始发布 / 更新证书 / 更新碳足迹 / 批次变更 | 版本历史 | `version_history[].change_type` |
| 变更说明 | Change summary | `change_summary` | 变更说明 | 版本历史 | `version_history[].change_summary` |
| 操作人 | Changed by | `changed_by` | 操作人 | 内部 / 可选展示 | `version_history[].changed_by` |
| 快照 | Snapshot | `snapshot` | 自动生成 | 不直接展示 | 内部审计 |
| 保存时间 | Created at | `created_at` | 自动生成 | 版本历史 | `version_history[].created_at` |

建议版本规则：

- `v1.0`：初始发布。
- `v1.1`：更新证书。
- `v1.2`：更新碳足迹或其他 ESG 指标。
- `v2.0`：产品批次、核心配方或供应链路径发生重大变化。

## 6. 材料组成与来源

材料组成按 `percentage` 从高到低排序，并按 `material_type` 分类展开。

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 材料名称 | Material name | `product_materials.material_name`, `material_name_zh` | 材料名称 | 材料卡片标题 | `materials[].name`, `materials[].name_zh` |
| 材料类型 | Material type | `material_type`, `material_type_zh` | 材料类型 | 分类按钮 / 卡片字段 | `materials[].type` |
| 占比 | Percentage | `percentage` | 占比 (%) | 材料配方 / 进度条 | `materials[].percentage` |
| 再生成分 | Recycled content | `recycled_content` | 再生成分 (%) | 材料卡片 / ESG | `materials[].recycled_content` |
| 来源国家 | Origin country | `origin_country` | 原产国 | 来源 | `materials[].origin_country` |
| 供应商 | Supplier name / ID | `supplier_id`, 导入时 `supplier_name` | 供应商 | 来源 / 证据链 | `materials[].supplier` |
| 化学信息 | Chemical info | `chemical_info`, `chemical_info_zh` | 化学信息 | REACH/RSL 说明 | `materials[].chemical_info` |
| 可回收性 | Recyclability | `recyclability`, `recyclability_zh` | 可回收性 | 材料卡片 | `materials[].recyclability` |
| 材料认证 | Certification | `certification` | 认证 | 材料卡片 | `materials[].certification` |

## 7. 组件、包装与辅料

组件和辅料按 `component_type` 分类展开。包装、配件、辅料不计入主材料配方占比，除非客户明确提供占比。

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 组件名称 | Component name | `product_bom.component_name`, `component_name_zh` | 组件名称 | 组件表 | `bom[].component` |
| 组件类型 | Component type | `component_type`, `component_type_zh` | 组件类型 | 分类按钮 / 组件表 | `bom[].type` |
| 数量 | Quantity | `quantity` | 数量 | 组件表 | `bom[].quantity_value` |
| 单位 | Unit | `unit` | 单位 | 组件表 | `bom[].unit` |
| 位置 / 用途 | Position | `position` | 位置 | 组件表 | `bom[].position` |

## 8. 化学品与受限物质

当前页面通过产品类型生成化学合规展示，导入模板已有 `ChemicalCompliance`。建议下一步新增独立表 `product_chemical_compliance`，避免页面硬编码。

| 标准字段 | 客户收集表字段 | 建议 Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 检测项目 | Test item | `test_item` | 检测项目 | 化学合规表 | `chemical_compliance[].test_item` |
| 检测结果 | Result | `result` | 检测结果 | 结果标签 | `chemical_compliance[].result` |
| 限值 / 标准 | Limit / Criterion | `limit_or_criterion` | 限值 / 判断标准 | 判断依据 | `chemical_compliance[].limit` |
| 法规 | Regulation | `regulation` | 法规 | REACH / RoHS / RSL | `chemical_compliance[].regulation` |
| 报告链接 | Report URL | `report_url` | 报告 URL | 下载报告 | `chemical_compliance[].report_url` |
| 验证状态 | Verification status | `verification_status` | 验证状态 | 状态 | `chemical_compliance[].verification_status` |
| 更新时间 | Last updated | `last_updated` | 更新时间 | 数据治理 | `chemical_compliance[].last_updated` |

## 9. 产品性能

当前页面通过产品类型生成产品性能展示，导入模板已有 `ProductPerformance`。建议下一步新增独立表 `product_performance_metrics`。

| 标准字段 | 客户收集表字段 | 建议 Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 性能指标 | Metric name | `metric_name` | 指标名称 | 产品性能卡片 | `performance[].metric_name` |
| 指标值 | Metric value | `metric_value` | 指标值 | 产品性能卡片 | `performance[].metric_value` |
| 单位 | Unit | `unit` | 单位 | 产品性能卡片 | `performance[].unit` |
| 测试方法 | Test method | `test_method` | 测试方法 | 测试依据 | `performance[].test_method` |
| 报告链接 | Report URL | `report_url` | 报告 URL | 文件链接 | `performance[].report_url` |
| 验证状态 | Verification status | `verification_status` | 验证状态 | 状态 | `performance[].verification_status` |
| 更新时间 | Last updated | `last_updated` | 更新时间 | 数据治理 | `performance[].last_updated` |

## 10. 生产与运输追溯

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 事件类型 | Event type | `product_traceability.event_type` | 事件类型 | 时间线标签 | `traceability[].type` |
| 事件名称 | Event name | `event_name`, `event_name_zh` | 事件名称 | 时间线标题 | `traceability[].event`, `event_zh` |
| 事件日期 | Event date | `event_date` | 事件日期 | 时间线日期 | `traceability[].date` |
| 国家 | Country | `country` | 国家 | 地点 | `traceability[].country` |
| 城市 | City | `city` | 城市 | 地点 | `traceability[].city` |
| 设施名称 | Facility name | `facility_name`, `facility_name_zh` | 设施名称 | 设施 | `traceability[].facility` |
| 供应商 | Supplier name | `supplier_name` | 供应商 | 供应链节点 | `traceability[].supplier_name` |
| 运输方式 | Transport method | `transport_method` | 运输方式 | 运输方式 | `traceability[].transport_method` |
| 验证状态 | Verification status | `verification_status` | 验证状态 | 状态 | `traceability[].verification_status` |
| 备注 | Notes | `notes`, `notes_zh` | 备注 | 详情展开 | `traceability[].notes` |

## 11. ESG 与循环性

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 碳足迹 | Carbon footprint | `product_esg_metrics.carbon_footprint` | 碳足迹 | ESG / 总览 | `esg.carbon_footprint` |
| 用水量 | Water usage | `water_usage` | 用水量 | ESG | `esg.water_usage` |
| 能源消耗 | Energy consumption | `energy_consumption` | 能源消耗 | ESG | `esg.energy_consumption` |
| 废弃物 | Waste generation | `waste_generation` | 废弃物 | ESG | `esg.waste_generation` |
| 再生成分 | Recycled content | `recycled_content` | 再生成分 | ESG / 总览 | `esg.recycled_content` |
| 化学品管理 | Chemical management | `chemical_management` | 化学品管理 | ESG / 化学说明 | `esg.chemical_management` |
| LCA 报告 | LCA report URL | `lca_report_url` | LCA 报告 URL | 证据文件 | `esg.lca_report_url` |
| 方法学 | Methodology | `methodology` | 方法学 | ESG | `esg.methodology` |
| 验证方 | Verified by | `verified_by` | 验证方 | 数据治理 | `esg.verified_by` |
| 可维修性评分 | Repairability score | `product_circularity.repairability_score` | 可维修性评分 | 循环性 | `circularity.repairability_score` |
| 可回收性评分 | Recyclability score | `recyclability_score` | 可回收性评分 | 循环性 | `circularity.recyclability_score` |
| 回收计划 | Take-back program | `take_back_program` | 回收计划 | End of Life | `circularity.take_back_program` |
| 支持转售 | Resale supported | `resale_supported` | 支持二手转售 | End of Life | `circularity.resale_supported` |
| 支持再制造 | Remanufacturing supported | `remanufacturing_supported` | 支持再制造 | End of Life | `circularity.remanufacturing_supported` |
| 拆解指南 | Disassembly guide | `disassembly_guide` | 拆解指南 | End of Life | `circularity.disassembly_guide` |
| 回收说明 | Recycling instructions | `recycling_instructions` | 回收说明 | End of Life | `circularity.recycling_instructions` |
| 生命周期结束信息 | End of life info | `end_of_life_info` | 生命周期结束信息 | End of Life | `circularity.end_of_life_info` |

## 12. 证书与文件

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 证书名称 | Certificate name | `product_certificates.certificate_name`, `certificate_name_zh` | 证书名称 | 认证证书卡片 | `certificates[].name` |
| 证书类型 | Certificate type | `certificate_type`, `certificate_type_zh` | 证书类型 | 证书类型 | `certificates[].type` |
| 证书编号 | Certificate number | `certificate_number` | 证书编号 | 证书编号 | `certificates[].number` |
| 签发机构 | Issuer | `issuer` | 签发机构 | 签发机构 | `certificates[].issuer` |
| 签发日期 | Issue date | `issue_date` | 签发日期 | 日期 | `certificates[].issue_date` |
| 到期日期 | Expiry date | `expiry_date` | 到期日期 | 日期 | `certificates[].expiry_date` |
| 证书链接 | Certificate URL | `certificate_url` | 证书 URL | 查看 PDF 证书 | `certificates[].url` |
| 验证状态 | Verification status | `verification_status` | 验证状态 | 状态 | `certificates[].verification_status` |
| 文件名称 | Document name | `product_documents.document_name` | 文件名称 | 证据文件 | `documents[].name` |
| 文件类型 | Document type | `document_type` | 文件类型 | 证据文件 | `documents[].type` |
| 文件 URL | File URL | `file_url` | 文件 URL | 下载文件 | `documents[].url` |
| 文件大小 | File size | `file_size` | 文件大小 | 文件信息 | `documents[].file_size` |
| 语言 | Language | `language` | 语言 | 文件信息 | `documents[].language` |
| 上传方 | Uploaded by | `uploaded_by` | 上传者 | 通常不公开 | `documents[].uploaded_by` |
| 版本 | Version | `version` | 版本 | 文件信息 | `documents[].version` |

## 13. 数据治理

| 标准字段 | 客户收集表字段 | Supabase 字段 | 后台录入字段 | DPP 页面展示 | JSON/API 字段 |
|---|---|---|---|---|---|
| 数据来源 | Data source | `product_data_governance.data_source` | 数据来源 | 数据来源明细 | `governance[].data_source` |
| 数据负责人 | Data owner | `data_owner` | 数据负责人 | 数据治理 | `governance[].data_owner` |
| 审计状态 | Audit status | `audit_status` | 审计状态 | 数据治理 | `governance[].audit_status` |
| 数据质量评分 | Data quality score | `data_quality_score` | 数据质量评分 | 数据治理 | `governance[].data_quality_score` |

## 推荐 JSON/API 返回结构

```json
{
  "product": {},
  "identity": {},
  "suppliers": [],
  "supplier_product_links": [],
  "materials": [],
  "bom": [],
  "chemical_compliance": [],
  "performance": [],
  "traceability": [],
  "esg": {},
  "circularity": {},
  "certificates": [],
  "documents": [],
  "governance": [],
  "version_history": [],
  "last_updated": "2026-06-11T00:00:00.000Z"
}
```

## 当前系统缺口

- `ChemicalCompliance` 和 `ProductPerformance` 已在导入模板和页面概念中存在，但尚未落成独立 Supabase 表。
- JSON 导出当前未返回 `suppliers` 和 `supplier_product_links`，建议下一步补齐。
- JSON 导出当前将 `circularity` 部分合并进 `esg`，建议拆成独立 `circularity` 对象。
- 后台产品详情目前支持录入主要表，但还没有独立的化学合规、产品性能编辑模块。
- 客户信息收集表目前是线索级字段，尚未覆盖完整产品资料收集；建议后续生成客户版 XLSX 收集模板。

## 下一步落地建议

1. 新增 `product_chemical_compliance` 和 `product_performance_metrics` 两张表。
2. 扩展后台产品详情，增加“化学合规”和“产品性能”可编辑模块。
3. 扩展 `/api/dpp-export`，使 JSON 完整返回供应商、化学合规、产品性能和独立循环性字段。
4. 基于本文档生成客户版 Excel 信息收集表。
5. 基于同一字段标准更新批量导入 XLSX 模板，保证客户表、后台、数据库、DPP 页面和 API 一致。
