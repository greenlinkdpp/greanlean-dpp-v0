# M4：文件、证据和生命周期补强实施说明

日期：2026-07-25  
状态：本地实现完成，等待执行迁移 `0019`  
前台状态：继续读取原发布链路，尚未切换

## 1. 数据模型

迁移 `0019` 新增四张兼容表，不删除或改写现有文档、证书和电池事件：

| 表 | 职责 |
| --- | --- |
| `dpp_file_asset` | 文件的逻辑身份、文档类别和最低访问等级 |
| `dpp_file_version` | 固定对象路径、版本号、文件大小和 SHA-256 |
| `dpp_field_evidence_link` | 规范字段到固定文件版本的证据关系 |
| `dpp_lifecycle_event` | 五行业通用的追加式生命周期事件 |

兼容边界：

- `product_documents` 和 `product_certificates` 继续可读；
- `dpp_evidence_links` 继续进入兼容聚合；
- `battery_lifecycle_event` 不迁表，与通用事件一起投影到生命周期模块；
- 已由新文件版本引用的旧 `product_documents` 不在证据索引中重复输出。

## 2. 不可变和权限规则

- 替换文件必须新增 `dpp_file_version`，禁止更新或删除旧版本；
- 文件版本使用唯一存储对象路径和 SHA-256；
- 每个文件版本固化访问等级，后续资产权限变化不影响历史发布；
- 字段证据关联禁止更新或删除，可通过 `supersedes_link_id` 追加替代关系；
- 文件的访问等级不得低于所支持字段或生命周期事件的访问等级；
- 生命周期事件禁止更新或删除；
- 通用生命周期事件按产品和粒度形成前序 Hash 链；
- 匿名用户只能读取已发布产品的 `PUBLIC` 记录；
- 登录用户由数据库授权函数计算可读等级；
- 所有写函数只授予 `service_role`。

这些 Hash 用于数据库内防篡改检测，不宣称已经写入区块链。

## 3. 服务端接口

### 上传和字段关联

```text
POST /api/internal/dpp-files
Content-Type: multipart/form-data
```

要求平台管理员登录。主要表单字段：

- `productId`
- `assetKey`
- `title`
- `documentType`
- `accessLevel`
- `file`
- 可选 `moduleCode`、`fieldCode`、`claimValue`

服务器会：

1. 校验文件大小和 MIME 类型；
2. 计算 SHA-256；
3. 使用不可覆盖对象路径上传到私有 `dpp-evidence` 存储桶；
4. 创建连续文件版本；
5. 可选地建立字段证据关联。

### 授权下载

```text
GET /api/dpp-files/{fileVersionId}
```

- 公开文件仅在产品已发布时允许匿名访问；
- 受限文件要求 Bearer 登录令牌和有效产品授权；
- 草稿产品文件仅平台内部账号可访问；
- 每次访问写入允许或拒绝审计；
- 通过后只返回 60 秒有效的 Supabase Storage 签名地址。

### 生命周期追加

```text
POST /api/internal/dpp-lifecycle
Content-Type: application/json
```

要求平台管理员登录。事件支持型号、批次和单体粒度，可关联固定文件版本和被替代事件。

## 4. 规范聚合

九模块聚合器现在同时读取新旧来源：

- 固定文件版本进入 `evidenceIndex`；
- 证据下载 URL 固定为 `/api/dpp-files/{fileVersionId}`；
- 字段引用固定文件版本 ID；
- 通用事件和电池事件进入同一个 `lifecycle` 模块；
- 新表尚未安装时，聚合器自动回退为空集合，不影响旧链路部署。

## 5. Supabase 执行

先完整运行：

```text
supabase/bundles/backoffice_alignment_phase3_install.sql
```

然后单独运行：

```text
supabase/bundles/backoffice_alignment_phase3_verify.sql
```

返回的一行中所有列必须为 `true`。

迁移后还需要在服务器运行环境配置：

```text
SUPABASE_SERVICE_ROLE_KEY
```

禁止使用 `NEXT_PUBLIC_` 前缀。当前 Vercel 生产环境尚未确认该变量存在，因此本阶段不部署 Production。

## 6. 本阶段不执行

- 不回填现有文件到新存储桶；
- 不切换公开 DPP 读取；
- 不删除旧文档或证书；
- 不把事件 Hash 宣称为区块链交易；
- 不开放供应商上传 UI；
- 不执行 Production 部署。

完成数据库验证后，下一步是选择一个 Preview 产品上传真实文件，验证版本替换、受限下载、证据映射和生命周期追加的端到端流程。
