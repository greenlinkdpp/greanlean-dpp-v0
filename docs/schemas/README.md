# GreanLean DPP JSON Schema

本目录定义 GreanLean DPP 对外 JSON 数据协议，用于统一：

- DPP JSON 下载文件
- 后续 API 返回结构
- 第三方系统对接字段
- 客户数据导入后的标准化输出

## 文件

| 文件 | 用途 |
|---|---|
| `greanlean-dpp.schema.json` | DPP 标准 JSON Schema，当前版本 `1.0.0` |
| `greanlean-dpp.example.json` | WPC PLANK 示例 JSON，用于对照字段结构 |

## 稳定顶层结构

所有 DPP JSON 输出应保持以下顶层字段稳定存在。没有数据时返回空数组、空对象或 `null`，不要删除字段。

```json
{
  "schema_version": "1.0.0",
  "passport_type": "Digital Product Passport",
  "locale": "multi",
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

## 设计约定

- `product.dpp_id` 是公开 DPP 页面、二维码和 API 查询的主标识。
- `product.sku` 是客户导入和后台录入时的业务匹配键。
- `product.status` 表示生命周期状态：`draft`、`review`、`published`、`updated`、`archived`、`expired`。
- `product.current_version` 表示当前对外版本，例如 `v1.0`、`v1.1`、`v2.0`。
- `version_history` 保存每次发布、证书更新、碳足迹更新和批次变更记录。
- `identity.digital_link_url` 使用 DPP ID 地址，不使用产品名称 slug。
- `materials` 只描述主材料配方和来源。
- `bom` 描述组件、包装、辅料和配件，不与主材料配方重复。
- `chemical_compliance` 和 `performance` 当前是标准输出字段，数据库后续建议拆成独立表。
- `governance` 必须说明数据来源、验证范围和更新时间，尤其是估算数据或 demo assumption。

## 后续对齐项

1. 将 `/api/dpp-export?format=json` 的返回结构升级为本 Schema。
2. 后台产品详情增加独立的化学合规和产品性能编辑模块。
3. 批量导入模板按本 Schema 的模块拆分 sheet。
4. 对外 API 文档直接引用本 Schema 的 `$id`。
