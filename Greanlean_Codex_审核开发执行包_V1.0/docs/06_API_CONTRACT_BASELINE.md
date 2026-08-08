# API契约基线

## 1. 原则

本文件定义业务能力，不强迫现有项目更换REST/GraphQL/RPC风格。Codex应优先保持现有约定，并在 `API_SPEC_ACTUAL.md` 中给出实际路径和兼容策略。

必须满足：

- API版本化；
- 组织/资源级鉴权；
- 错误可定位；
- 写操作审计；
- 批量和外部调用幂等；
- 导出与页面使用同一权限投影；
- 公共护照只读取已发布不可变版本。

## 2. 通用响应

成功响应建议包含：`data`、`meta`、`request_id`。

错误响应至少包含：

```json
{
  "error": {
    "code": "PASSPORT_PUBLISH_BLOCKED",
    "message": "发布被阻断",
    "request_id": "...",
    "details": [
      {"entity": "BatteryItem", "entity_id": "...", "field_key": "rated_energy_kwh", "rule": "BAT-001", "message": "..."}
    ]
  }
}
```

禁止在错误中返回堆栈、SQL、密钥、对象存储路径或其他租户信息。

## 3. 通用要求

- 分页：cursor优先；保留现有分页风格也可；
- 过滤：明确白名单，不拼接SQL；
- 幂等：导入、批量创建、Registry提交、Webhook写入支持Idempotency-Key；
- 并发：更新可变资源使用ETag/row_version；
- 文件：MIME、扩展名、大小、恶意内容、哈希校验；
- 审计：请求ID贯穿任务、导出、文件和后台Job；
- 异步任务：返回job_id，可查询进度、失败行和重试。

## 4. 目标资源能力

以下路径仅为逻辑示例，实际实现须适配现有仓库。

### 4.1 组织与成员

- `GET/POST /api/v1/organisations`
- `GET/PATCH /api/v1/organisations/{id}`
- `GET/PUT /api/v1/organisations/{id}/economic-operator-profile`
- `GET/POST/PATCH /api/v1/organisations/{id}/members`
- `GET /api/v1/organisations/{id}/registry-readiness`

### 4.2 项目和适用性

- `GET/POST /api/v1/projects`
- `GET/PATCH /api/v1/projects/{id}`
- `POST /api/v1/projects/{id}/applicability-assessments`
- `GET /api/v1/projects/{id}/gaps`
- `GET/POST/PATCH /api/v1/projects/{id}/tasks`
- `POST /api/v1/projects/{id}/acceptance`

适用性响应必须包含规则版本、输入摘要、结果、待确认项和免责声明。

### 4.3 产品层级

- `GET/POST /api/v1/product-models`
- `GET/PATCH /api/v1/product-models/{id}`
- `GET/POST /api/v1/product-models/{id}/batches`
- `GET/POST /api/v1/product-models/{id}/items`
- `POST /api/v1/product-models/{id}/items:bulk-create`
- `GET/PATCH /api/v1/battery-items/{id}`
- `GET /api/v1/battery-items/{id}/resolved-data`（含继承来源）

批量创建返回成功、失败和每行错误；重复幂等键不重复创建。

### 4.4 标识和UPI

- `GET/POST /api/v1/{entity}/{id}/identifiers`
- `POST /api/v1/battery-items/{id}/upi:reserve`
- `POST /api/v1/battery-items/{id}/qr:generate`
- `GET /p/{public_upi_key}` 公共解析，不暴露内部ID

UPI预留和发布分开；退役UPI保持可追溯重定向。

### 4.5 Schema与字段值

- `GET /api/v1/schemas`
- `GET /api/v1/schemas/{key}/versions/{version}`
- `GET /api/v1/product-models/{id}/field-requirements`
- `GET/PUT /api/v1/{target_type}/{id}/field-values`
- `POST /api/v1/{target_type}/{id}/validate`
- `GET /api/v1/{target_type}/{id}/gaps`

更新必须返回字段级校验结果和继承/覆盖来源。

### 4.6 BOM和材料

- `GET/POST /api/v1/product-models/{id}/components`
- `GET/POST/PATCH /api/v1/components/{id}/bom-lines`
- `POST /api/v1/product-models/{id}/bom:import`
- `GET /api/v1/import-jobs/{job_id}`
- `GET /api/v1/import-jobs/{job_id}/errors`

### 4.7 证据

- `POST /api/v1/evidence:prepare-upload`
- `POST /api/v1/evidence`
- `GET/PATCH /api/v1/evidence/{id}`
- `POST/DELETE /api/v1/evidence/{id}/links`
- `GET /api/v1/evidence/{id}/download`（鉴权或短签名）
- `POST /api/v1/evidence/{id}/review`

文件上传与元数据提交必须防止“有记录无文件”或“有文件无归属”。

### 4.8 审核和发布

- `POST /api/v1/battery-items/{id}/drafts`
- `GET/PATCH /api/v1/passport-drafts/{id}`
- `POST /api/v1/passport-drafts/{id}:submit`
- `POST /api/v1/passport-drafts/{id}:return`
- `POST /api/v1/passport-drafts/{id}:approve`
- `POST /api/v1/passport-drafts/{id}:publish`
- `GET /api/v1/battery-items/{id}/versions`
- `GET /api/v1/passport-versions/{id}`
- `POST /api/v1/passport-versions/{id}:withdraw`

每个转换检查当前状态和角色，不能直接改status字段绕过工作流。

### 4.9 公共和受限投影

- `GET /api/public/v1/passports/{upi_key}`
- `GET /api/public/v1/passports/{upi_key}/document.pdf`
- `GET /api/public/v1/passports/{upi_key}/data.json`
- `GET /api/v1/authorised/passports/{upi_key}`

页面、PDF和JSON必须返回同一version_number、published_at和snapshot_hash。受限接口根据组织和授权投影字段。

### 4.10 BMS与生命周期

- `POST /api/v1/battery-items/{id}/measurements:import`
- `GET /api/v1/battery-items/{id}/measurements`
- `POST /api/v1/battery-items/{id}/lifecycle-events`
- `GET /api/v1/battery-items/{id}/lifecycle-events`

P0可仅实现合成/CSV基础结构，P1再开放外部API。

### 4.11 Registry

- `GET /api/v1/registry/readiness`
- `POST /api/v1/registry/submissions:precheck`
- `POST /api/v1/registry/submissions`（Feature Flag）
- `GET /api/v1/registry/submissions/{id}`
- `POST /api/v1/registry/submissions/{id}:retry`

正式成功状态只由适配器解析并验证官方URI后写入，普通业务用户不能手工设置REGISTERED。
