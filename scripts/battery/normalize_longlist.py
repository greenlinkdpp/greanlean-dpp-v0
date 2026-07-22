#!/usr/bin/env python3
"""Normalize BatteryPass-Ready Longlist v1.3 into the checked-in runtime catalog."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

try:
    import openpyxl
except ImportError as exc:
    raise SystemExit("openpyxl is required to normalize the BatteryPass XLSX source") from exc


ZH_LABELS = [
    "DPP Schema 版本", "DPP 状态", "DPP 数据粒度", "DPP 最近更新时间", "唯一电池护照标识 / 唯一 DPP 标识",
    "唯一电池标识 / 唯一产品标识", "电池型号标识", "电池序列号", "唯一经济运营者标识", "唯一制造商标识",
    "唯一制造设施标识", "经济运营者信息", "制造商信息", "制造地点", "制造日期", "电池投入使用日期",
    "电池质保期", "电池类别", "电池质量", "电池状态", "分类收集标识", "镉和铅标识", "碳足迹标签",
    "灭火剂", "标签和符号含义", "欧盟符合性声明", "证明合规的测试报告结果", "单位功能电池碳足迹",
    "原材料获取和预处理阶段碳足迹贡献", "主要产品生产阶段碳足迹贡献", "分销阶段碳足迹贡献",
    "生命周期结束和回收阶段碳足迹贡献", "碳足迹绩效等级", "公开碳足迹研究网页链接", "电池绝对碳足迹",
    "尽职调查报告信息", "认可计划的第三方保证", "供应链指数", "电池化学体系", "关键原材料",
    "正极、负极和电解液所用材料", "有害物质", "物质对环境、人体健康、安全和人员的影响",
    "电池包移除和拆解手册", "组件零件编号", "备件来源信息", "安全措施", "消费前再生镍比例",
    "消费前再生钴比例", "消费前再生锂比例", "消费后再生镍比例", "消费后再生钴比例", "消费后再生锂比例",
    "再生铅比例", "可再生成分比例", "最终用户参与废物预防的信息", "最终用户参与废旧电池分类收集的信息",
    "电池收集、第二次寿命准备和寿命结束处理信息", "额定容量", "剩余容量", "容量衰减", "认证可用电池能量",
    "剩余可用电池能量", "认证能量状态（SOCE）", "荷电状态（SoC）", "最低电压", "最高电压", "标称电压",
    "初始功率能力", "剩余功率能力", "功率衰减", "最大允许电池功率", "标称电池功率与电池能量比",
    "初始往返能量效率", "循环寿命 50% 时的往返能量效率", "剩余往返能量效率", "往返能量效率衰减",
    "初始自放电率", "当前自放电率", "自放电率变化", "电芯和电池包初始内阻（建议提供模组数据）",
    "电池包内阻增长（建议提供电芯和模组数据）", "预期日历寿命", "预期充放电循环次数", "完整充放电循环次数",
    "循环寿命参考测试", "循环寿命测试 C 倍率", "能量吞吐量", "容量吞吐量", "寿命耗尽容量阈值",
    "温度信息", "闲置状态温度范围下限", "闲置状态温度范围上限", "高于温度边界的持续时间",
    "低于温度边界的持续时间", "高温边界以上充电持续时间", "低温边界以下充电持续时间", "深度放电事件次数",
    "过充事件次数", "事故信息",
]

GROUPS = {
    "Identifiers and product data": ("identifiers_product", "产品及电池身份", "IdentifiersAndProductData"),
    "Symbols, labels and documentation of conformity": ("conformity_documents", "标签与合规文件", "SymbolsLabelsAndDocumentationOfConformity"),
    "Battery carbon footprint": ("carbon_sustainability", "碳足迹与可持续性", "BatteryCarbonFootprint"),
    "Supply chain due diligence": ("due_diligence", "供应链尽职调查", "SupplyChainDueDiligence"),
    "Battery materials and composition": ("materials_composition", "材料和化学组成", "BatteryMaterialsAndComposition"),
    "Circularity and resource efficiency": ("circularity_safety", "循环、拆解与安全", "CircularityAndResourceEfficiency"),
    "Performance and durability": ("performance_durability", "性能和耐久性", "PerformanceAndDurability"),
}

PROFILE_COLUMNS = {
    "battery.ev": 3,
    "battery.lmt": 4,
    "battery.industrial.non_stationary": 5,
    "battery.industrial.stationary": 6,
}

SCHEMA_FILES = {
    "battery.ev": "EV.json",
    "battery.lmt": "LMT.json",
    "battery.industrial.without_bms": "Industrial_Without_BMS.json",
    "battery.industrial.non_stationary": "Other_Industrial_Above_2kWh.json",
    "battery.industrial.stationary": "Stationary_Industrial_Above_2kWh.json",
}


def stable_code(label: str) -> str:
    code = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")
    return f"battery.{code}"


def comparable(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def requirement_status(value: object) -> str:
    marker = str(value or "").strip().lower()
    return {
        "x": "CONFIRMED_MANDATORY",
        "(x)": "DRAFT_MANDATORY",
        "o": "VOLUNTARY",
        "-": "NOT_APPLICABLE",
        "": "NOT_APPLICABLE",
    }.get(marker, "TBD")


def access_level(value: object) -> str:
    text = str(value or "").lower()
    if any(term in text for term in ("notified", "market surveillance", "authorities")):
        return "AUTHORITY_ONLY"
    if "legitimate" in text:
        return "LEGITIMATE_INTEREST"
    return "PUBLIC"


def granularity(value: object) -> str:
    text = str(value or "").lower()
    if "individual" in text:
        return "ITEM"
    if "calendar year" in text:
        return "MODEL_YEAR_SITE"
    if "manufacturing site" in text:
        return "MODEL_SITE"
    if "batch" in text:
        return "BATCH"
    return "MODEL"


def data_type(value: object) -> str:
    text = str(value or "").lower()
    if "uri" in text or "url" in text or "web link" in text:
        return "uri"
    if "timestamp" in text or "date-time" in text:
        return "datetime"
    if text.strip() == "date":
        return "date"
    if "boolean" in text:
        return "boolean"
    if "integer" in text:
        return "integer"
    if "decimal" in text or "number" in text:
        return "decimal"
    if "array" in text or "list" in text:
        return "array"
    return "string"


def source_suggestion(group_code: str) -> str:
    return {
        "identifiers_product": "优先使用 ERP、型号主数据、GS1 标识和经核验的经济运营者资料。",
        "conformity_documents": "上传正式签署文件或实验室报告，并保存文件 Hash、版本和核验状态。",
        "carbon_sustainability": "使用经核验的碳足迹声明或 LCA 研究，记录方法、功能单位和制造场所。",
        "due_diligence": "使用责任采购、第三方保证和供应链尽调记录，不把链接本身视为已核验证据。",
        "materials_composition": "使用 BOM、供应商声明和化学检测结果，并记录材料角色和来源。",
        "circularity_safety": "使用拆解手册、维修资料、标签文件和寿命结束处理说明。",
        "performance_durability": "静态数据使用型式试验或产品规格；动态数据使用 BMS/设备采集并保留历史。",
    }[group_code]


def evidence_required(label: str, data_format: object) -> bool:
    text = f"{label} {data_format or ''}".lower()
    return any(term in text for term in ("report", "declaration", "manual", "study", "assurance", "test", "uri", "url", "safety measure"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx", type=Path)
    parser.add_argument("schema_dir", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    schemas = {code: json.loads((args.schema_dir / filename).read_text()) for code, filename in SCHEMA_FILES.items()}
    property_lookup: dict[str, dict[str, tuple[str, str]]] = {}
    for schema_code, schema in schemas.items():
        lookup: dict[str, tuple[str, str]] = {}
        for group_name, (_, _, definition_name) in GROUPS.items():
            definition = schema.get("$defs", {}).get(definition_name, {})
            for property_name in definition.get("properties", {}):
                lookup[comparable(property_name)] = (definition_name, property_name)
        property_lookup[schema_code] = lookup

    workbook = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=True)
    sheet = workbook["Data attribute longlist_DR_v1.3"]
    fields = []
    for row in sheet.iter_rows(min_row=8, values_only=True):
        sequence = row[1]
        label_en = row[9]
        if not isinstance(sequence, (int, float)) or not label_en:
            continue
        index = int(sequence)
        group_code, group_zh, definition_name = GROUPS[str(row[7]).strip()]
        behavior = "DYNAMIC" if "dynamic" in str(row[17] or "").lower() else "STATIC"
        field_granularity = granularity(row[19])
        if behavior == "DYNAMIC":
            workflow_step = "item_operation"
        elif group_code == "identifiers_product":
            workflow_step = "identity" if index <= 11 else "economic_operator" if index == 12 else "manufacturing"
        elif group_code in ("materials_composition",):
            workflow_step = "materials"
        elif group_code in ("carbon_sustainability", "due_diligence"):
            workflow_step = "sustainability"
        elif group_code == "performance_durability":
            workflow_step = "performance"
        elif group_code == "conformity_documents":
            workflow_step = "documents"
        else:
            workflow_step = "circularity_safety"

        pointers = {}
        key = comparable(str(label_en))
        for schema_code, lookup in property_lookup.items():
            match = lookup.get(key)
            pointers[schema_code] = f"/Battery_Passport/{match[0]}/{match[1]}" if match else None

        category_statuses = {code: requirement_status(row[column]) for code, column in PROFILE_COLUMNS.items()}
        category_statuses.update({"battery.portable": "TBD", "battery.sli": "TBD", "battery.other": "TBD"})
        fields.append({
            "sequence": index,
            "fieldCode": stable_code(str(label_en)),
            "groupCode": group_code,
            "groupLabelEn": str(row[7]).strip(),
            "groupLabelZh": group_zh,
            "subgroupLabelEn": str(row[8] or "").strip() or None,
            "labelEn": str(label_en).strip(),
            "labelZh": ZH_LABELS[index - 1],
            "descriptionEn": str(row[10] or "").strip(),
            "instructionZh": f"按适用法规和当前 Schema 版本填写“{ZH_LABELS[index - 1]}”，同时记录数据来源、采集时间和责任人。",
            "requirementsEn": str(row[11] or "").strip() or None,
            "recommendationsEn": str(row[12] or "").strip() or None,
            "regulatoryReference": str(row[13] or "").strip() or None,
            "unit": None if str(row[14] or "").strip().lower() in ("", "n.a.") else str(row[14]).strip(),
            "sourceDataFormat": str(row[15] or "").strip() or None,
            "dataType": data_type(row[15]),
            "sourceAccessRights": str(row[16] or "").strip() or None,
            "accessLevel": access_level(row[16]),
            "dataBehavior": behavior,
            "updateRequirement": str(row[18] or "").strip() or None,
            "sourceGranularity": str(row[19] or "").strip() or None,
            "dataGranularity": field_granularity,
            "componentApplicability": {"pack": row[20] == "x", "module": row[21] == "x", "cell": row[22] == "x"},
            "categoryRequirementStatus": category_statuses,
            "jsonPointers": pointers,
            "workflowStep": workflow_step,
            "evidenceRequired": evidence_required(str(label_en), row[15]),
            "sourceSuggestionZh": source_suggestion(group_code),
        })

    if len(fields) != 100 or len(ZH_LABELS) != 100:
        raise SystemExit(f"Expected 100 Longlist fields and translations, got {len(fields)} and {len(ZH_LABELS)}")

    payload = {
        "catalogVersion": "1.3.0",
        "sourceName": "BatteryPass-Ready Data Attribute Longlist",
        "sourceVersion": "1.3",
        "sourceDate": "2026-03",
        "license": "CC BY 4.0",
        "sourceSha256": sha256(args.xlsx),
        "schemaSources": {
            code: {"file": filename, "sha256": sha256(args.schema_dir / filename)}
            for code, filename in SCHEMA_FILES.items()
        },
        "disclaimerZh": "BatteryPass-Ready 是参考模型，部分规则仍可能变化；本目录不等同于最终欧盟 Registry 语义目录。",
        "fields": fields,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
