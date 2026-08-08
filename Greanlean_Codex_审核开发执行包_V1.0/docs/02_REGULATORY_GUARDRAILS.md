# 法规与Registry实现边界

## 1. 本文件的目的

本文件不是法律意见。其作用是防止开发过程中把“平台设计、参考模型、待发布细则、模拟数据或测试返回”错误实现成已经确认的法定义务或正式登记结果。

基线时点为2026-08-03，来自需求源文件。Codex不得静默更新法规结论；发现更新时，只能记录来源、日期、影响和建议，等待产品/法规负责人确认后调整Schema版本。

## 2. 事实层级

字段和规则必须标记来源层级：

- `EU_REGULATION`：已发布欧盟法规正文；
- `EU_IMPLEMENTING_ACT`：已发布实施/授权文件；
- `OFFICIAL_REGISTRY_GUIDE`：官方Registry指南或正式接口文档；
- `OFFICIAL_SEMANTIC_CATALOG`：官方发布的产品组语义目录；
- `INDUSTRY_REFERENCE`：BatteryPass等行业参考模型；
- `GREANLEAN_PRODUCT`：Greanlean自愿/产品字段；
- `CUSTOMER_CUSTOM`：客户自定义字段。

任何字段都要有 `schema_source`、`schema_version`、`effective_date`、`legal_basis`（可空但需说明）和 `mandatory_condition`。

## 3. 平台不得做出的表述

- 不得把平台发布等同于认证、核查、合规证明或监管批准；
- 不得把企业自报数据标为第三方验证；
- 不得把演示数据标为真实客户数据；
- 不得把测试/模拟Registry返回标为正式登记；
- 不得在没有官方URI和回执记录时显示“已注册”；
- 不得凭开发者推测写死最终字段语义和访问权细则；
- 不得自动给出不可撤销的法律适用结论。

## 4. Registry状态机的最低约束

允许状态：

```text
NOT_PREPARED
PREPARING
PRECHECK_FAILED
PRECHECK_PASSED
TEST_SUBMITTED
TEST_FAILED
TEST_SUCCEEDED
PRODUCTION_SUBMITTED
PRODUCTION_FAILED
REGISTERED
SUSPENDED
ARCHIVED
```

核心约束：

- `REGISTERED` 必须同时存在官方URI、环境、请求文件哈希、响应原文/存档、提交时间和组织身份；
- Mock和测试环境最多进入 `TEST_SUCCEEDED`；
- `PRODUCTION_SUBMITTED`不能自动超时转成功；
- 失败必须保留correlation ID、原始请求、错误代码和可读错误；
- Registry适配器必须Feature Flag控制；
- 生产凭据不得进入数据库明文、日志、前端或代码库。

## 5. 适用性评估输出

系统可输出：

- 初步适用；
- 初步不适用；
- 待确认；
- 信息不足。

系统必须同时输出：输入事实、判断规则版本、缺失信息、责任人和免责声明。最终结论由经济运营者及其专业顾问确认。

## 6. 验证状态

只允许根据证据强度选择：

- `MISSING`
- `SELF_DECLARED`
- `DOCUMENT_SUPPORTED`
- `THIRD_PARTY_VERIFIED`
- `NOT_APPLICABLE`
- `PENDING_CONFIRMATION`

`THIRD_PARTY_VERIFIED`必须有机构、范围、日期、文件和适用对象；没有任何一项时自动降级或阻断。
