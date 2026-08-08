# 统一 DPP 平台阶段 5：电池动态数据实施记录

日期：2026-07-25  
目标版本：v0.7.0  
阶段状态：已完成；Supabase 迁移、初始化数据和本地验收均已通过

完成日期：2026-07-25

数据库验收结果：

- 3 张设备接入表、2 个事务写入函数和 25 项动态指标均已生效；
- 接入日志只追加触发器、匿名访问隔离和凭据哈希存储检查均通过；
- LMT 与固定式工业储能电池分别写入 270 条初始化指标和 2 条生命周期事件；
- 未登录访问动态指标接口返回 `401 AUTH_REQUIRED`，公众接口未暴露单体运行数据。

## 1. 目标

在统一 DPP 页面中增加受限的“运行状态与电池健康”模块：

```text
电池单体
→ BMS / EMS / 网关 / 维保系统按快照或事件上报
→ 服务端验证设备凭据、时间戳、幂等键、指标范围和单位
→ 数据库事务追加指标或事件
→ 专业用户通过组织与产品授权读取
→ 公众页面不返回单体运行数值
```

该模块用于 DPP 状态维护，不是秒级实时监控系统。

## 2. 数据模型

迁移 `0014_battery_operating_data_integration.sql` 新增：

- `battery_source_device`：设备与组织、产品、单体的绑定；
- `battery_integration_credential`：设备写入凭据，只保存 SHA-256 哈希；
- `battery_ingestion_request`：只追加的幂等和接入审计；
- `FULL_CHARGE_CAPACITY`：满充容量指标；
- `CURRENT_INTERNAL_RESISTANCE`：当前内阻指标。

现有表新增：

- `received_at`
- `quality_status`
- `collection_mode`
- `source_device_id`
- `ingestion_request_id`
- 指标纠正引用和原因

指标和事件历史仍禁止更新或删除；纠正必须追加新记录。

## 3. 数据边界

### 公众访问

- 可以知道产品支持运行数据持续更新；
- 不返回单体序列、SOC、SOH、温度、内阻或历史趋势；
- 扫码和 URL 参数不会产生专业权限。

### 专业与监管访问

当前账号通过组织、角色和产品授权后，可以读取：

- 最新状态快照；
- 最近测量时间与接收时间；
- 来源设备和来源系统；
- 数据质量、核验状态和新鲜度；
- 24 小时、7 天、30 天、12 个月和全生命周期趋势；
- 维修、故障、安全、BMS 更换、再利用、退役和回收事件。

## 4. 初始化数据

运行 `supabase/seeds/battery_dynamic_initial_data.sql` 后，LMT 和工业储能产品各获得：

- 一个规范化单体身份；
- 30 天状态历史；
- SOC、SOH、满充容量、剩余容量、完整循环、温度、当前内阻、能量吞吐量和剩余功率；
- 投入使用与检查事件。

所有初始化记录固定标记为：

```text
data_source = INITIAL_DATASET
verification_status = UNVERIFIED
source_device = INITIAL-IMPORT
quality_status = UNKNOWN
```

页面显示“初始化数据”和“未核验”，不会表达为 BMS 实时上报。

## 5. 设备凭据

平台管理员通过以下接口创建或轮换凭据：

```text
POST /api/integrations/battery/credentials
Authorization: Bearer <Supabase access token>
```

请求体：

```json
{
  "organisationId": "<organisation uuid>",
  "productId": "<product uuid>",
  "batteryItemId": "<battery item uuid>",
  "deviceIdentifier": "BMS-LMT-000001",
  "sourceSystem": "BMS",
  "displayName": "LMT battery BMS",
  "rateLimitPerMinute": 120
}
```

轮换时增加：

```json
{
  "rotateCredentialId": "<active credential uuid>"
}
```

明文 API Key 只在创建响应中返回一次。数据库仅保存密钥哈希。

## 6. 指标写入

```text
POST /api/integrations/battery/items/{itemId}/metrics
X-API-Key: <device api key>
X-Greanlean-Timestamp: 2026-07-25T10:30:00Z
X-Idempotency-Key: bms-lmt-000001-20260725
Content-Type: application/json
```

请求体：

```json
{
  "metrics": [
    {
      "metricCode": "SOC",
      "value": 76.4,
      "unit": "%",
      "measuredAt": "2026-07-25T10:29:30Z",
      "qualityStatus": "VALID",
      "collectionMode": "DAILY_SNAPSHOT"
    },
    {
      "metricCode": "TEMPERATURE",
      "value": 24.8,
      "unit": "°C",
      "measuredAt": "2026-07-25T10:29:30Z",
      "qualityStatus": "VALID",
      "collectionMode": "DAILY_SNAPSHOT"
    }
  ]
}
```

同一凭据和幂等键重复提交时返回已有请求，不重复写入指标。

## 7. 事件写入

```text
POST /api/integrations/battery/items/{itemId}/events
```

请求头与指标写入相同。支持的事件：

- `COMMISSIONING`
- `INSPECTION`
- `MAINTENANCE`
- `REPAIR`
- `FAULT`
- `SAFETY_EVENT`
- `BMS_REPLACEMENT`
- `REUSE`
- `REPURPOSE`
- `RETIREMENT`
- `RECYCLING`

示例：

```json
{
  "eventType": "MAINTENANCE",
  "eventTime": "2026-07-25T09:00:00Z",
  "eventData": {
    "note": "Connector inspection completed."
  },
  "qualityStatus": "VALID",
  "collectionMode": "EVENT_DRIVEN",
  "idempotencyKey": "service-lmt-000001-20260725"
}
```

## 8. 受权读取

```text
GET /api/battery-dpp/items/{itemId}/metrics/latest
GET /api/battery-dpp/items/{itemId}/metrics/history?range=30d&metrics=SOC,SOH_VOLUNTARY
Authorization: Bearer <Supabase access token>
```

读取接口先核验账号身份、组织、产品授权和访问等级，再查询单体运行数据。未登录返回 `401`，无产品授权返回 `403`。

## 9. 安全控制

- 凭据按组织与设备独立签发；
- 设备必须绑定具体电池单体；
- 凭据支持轮换、撤销、有效期和独立限流；
- 请求时间戳仅允许五分钟窗口；
- 幂等键防止重复写入；
- 指标代码、范围和单位必须匹配目录；
- 每批最多 100 条，正文最大 128 KB；
- 指标和事件通过数据库事务写入；
- 接入日志不保存明文凭据或完整原始载荷；
- 数据库写入函数只授予 `service_role`；
- 未来请求签名或 mTLS 通过 `signature_status` 和设备元数据扩展，不把预留能力表述为已启用。

## 10. 迁移执行

1. 执行 `supabase/migrations/0014_battery_operating_data_integration.sql`；
2. 执行 `supabase/bundles/battery_operating_data_verify.sql`；
3. 确认返回的一行六列全部为 `true`；
4. 执行 `supabase/seeds/battery_dynamic_initial_data.sql`；
5. 确认 LMT 和工业储能各返回 `270` 条指标、`2` 条事件；
6. 使用已批准专业账号打开统一 DPP 页面；
7. 确认公众页面没有运行数值，专业页面显示快照、趋势和事件；
8. 创建测试设备凭据并进行一次指标与事件幂等测试。

## 11. 回滚

回滚文件：

`supabase/rollbacks/0014_battery_operating_data_integration.down.sql`

一旦设备、接入日志或真实运行数据已经写入，不应直接执行回滚。应先停用设备凭据和接口，再采用前向修复保留历史记录。

## 12. 验收标准

- 电池统一 DPP 第 5 模块显示最新状态、来源、质量和新鲜度；
- 专业用户可查看趋势和生命周期事件；
- 公众页面不泄露单体动态数据；
- 初始化数据和设备上报可以区分；
- 设备凭据只保存哈希并支持轮换；
- 写入 API 校验时间戳、幂等、绑定、范围、单位、批量大小和限流；
- 指标、事件和接入日志只追加；
- 中文页面不出现未翻译的说明性英文；
- TypeScript、单元、集成和迁移测试通过。
