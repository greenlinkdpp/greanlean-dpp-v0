export type DppSectorProfile = {
  sectorCode: string;
  sectorName: string;
  sectorNameZh: string;
  categoryCode: string;
  categoryName: string;
  categoryNameZh: string;
  subcategoryCode: string;
  subcategoryName: string;
  subcategoryNameZh: string;
  profileKey: string;
  name: string;
  nameZh: string;
  regulationBasis: string;
  granularityLevels: string[];
};

export const DPP_SECTOR_PROFILES: DppSectorProfile[] = [
  {
    sectorCode: "battery",
    sectorName: "Battery",
    sectorNameZh: "电池",
    categoryCode: "ev_battery",
    categoryName: "EV battery",
    categoryNameZh: "电动车电池",
    subcategoryCode: "battery_unit",
    subcategoryName: "Battery unit",
    subcategoryNameZh: "电池单元",
    profileKey: "battery.ev.unit.v1",
    name: "Battery / EV battery / Battery unit",
    nameZh: "电池 / 电动车电池 / 电池单元",
    regulationBasis: "EU Battery Regulation battery passport",
    granularityLevels: ["model", "batch", "item"],
  },
  {
    sectorCode: "battery",
    sectorName: "Battery",
    sectorNameZh: "电池",
    categoryCode: "lmt_battery",
    categoryName: "LMT battery",
    categoryNameZh: "轻型交通工具电池",
    subcategoryCode: "battery_unit",
    subcategoryName: "Battery unit",
    subcategoryNameZh: "电池单元",
    profileKey: "battery.lmt.unit.v1",
    name: "Battery / LMT battery / Battery unit",
    nameZh: "电池 / LMT 电池 / 电池单元",
    regulationBasis: "BatteryPass-Ready LMT schema and EU Battery Regulation",
    granularityLevels: ["item"],
  },
  {
    sectorCode: "battery",
    sectorName: "Battery",
    sectorNameZh: "电池",
    categoryCode: "industrial_without_bms",
    categoryName: "Industrial without BMS",
    categoryNameZh: "无 BMS 工业电池",
    subcategoryCode: "battery_unit",
    subcategoryName: "Battery unit",
    subcategoryNameZh: "电池单元",
    profileKey: "battery.industrial.without_bms.v1",
    name: "Battery / Industrial battery / Without BMS",
    nameZh: "电池 / 工业电池 / 无 BMS",
    regulationBasis: "BatteryPass-Ready Industrial without BMS schema and EU Battery Regulation",
    granularityLevels: ["item"],
  },
  {
    sectorCode: "battery",
    sectorName: "Battery",
    sectorNameZh: "电池",
    categoryCode: "industrial_other_above_2kwh",
    categoryName: "Other industrial above 2 kWh",
    categoryNameZh: "其他 2kWh 以上工业电池",
    subcategoryCode: "battery_unit",
    subcategoryName: "Battery unit",
    subcategoryNameZh: "电池单元",
    profileKey: "battery.industrial.other_above_2kwh.v1",
    name: "Battery / Industrial battery / Other above 2 kWh",
    nameZh: "电池 / 工业电池 / 其他 2kWh 以上",
    regulationBasis: "BatteryPass-Ready Other Industrial above 2kWh schema and EU Battery Regulation",
    granularityLevels: ["item"],
  },
  {
    sectorCode: "battery",
    sectorName: "Battery",
    sectorNameZh: "电池",
    categoryCode: "industrial_stationary_above_2kwh",
    categoryName: "Stationary industrial above 2 kWh",
    categoryNameZh: "2kWh 以上固定式工业电池",
    subcategoryCode: "battery_unit",
    subcategoryName: "Battery unit",
    subcategoryNameZh: "电池单元",
    profileKey: "battery.industrial.stationary_above_2kwh.v1",
    name: "Battery / Industrial battery / Stationary above 2 kWh",
    nameZh: "电池 / 工业电池 / 固定式 2kWh 以上",
    regulationBasis: "BatteryPass-Ready Stationary Industrial above 2kWh schema and EU Battery Regulation",
    granularityLevels: ["item"],
  },
  {
    sectorCode: "textile",
    sectorName: "Textile",
    sectorNameZh: "纺织",
    categoryCode: "apparel",
    categoryName: "Apparel",
    categoryNameZh: "服装",
    subcategoryCode: "garment",
    subcategoryName: "Garment",
    subcategoryNameZh: "成衣",
    profileKey: "textile.apparel.garment.v1",
    name: "Textile / Apparel / Garment",
    nameZh: "纺织 / 服装 / 成衣",
    regulationBasis: "ESPR textile product group preparation",
    granularityLevels: ["model", "batch", "item"],
  },
  {
    sectorCode: "textile",
    sectorName: "Textile",
    sectorNameZh: "纺织",
    categoryCode: "fabric",
    categoryName: "Fabric",
    categoryNameZh: "面料",
    subcategoryCode: "woven_fabric",
    subcategoryName: "Woven fabric",
    subcategoryNameZh: "梭织面料",
    profileKey: "textile.fabric.woven.v1",
    name: "Textile / Fabric / Woven fabric",
    nameZh: "纺织 / 面料 / 梭织面料",
    regulationBasis: "ESPR textile product group preparation",
    granularityLevels: ["model", "batch"],
  },
  {
    sectorCode: "furniture",
    sectorName: "Furniture",
    sectorNameZh: "家具",
    categoryCode: "office_furniture",
    categoryName: "Office furniture",
    categoryNameZh: "办公家具",
    subcategoryCode: "office_chair",
    subcategoryName: "Office chair",
    subcategoryNameZh: "办公椅",
    profileKey: "furniture.office.chair.v1",
    name: "Furniture / Office furniture / Office chair",
    nameZh: "家具 / 办公家具 / 办公椅",
    regulationBasis: "ESPR furniture product group preparation",
    granularityLevels: ["model", "batch"],
  },
  {
    sectorCode: "construction",
    sectorName: "Construction",
    sectorNameZh: "建材",
    categoryCode: "building_material",
    categoryName: "Building material",
    categoryNameZh: "建筑材料",
    subcategoryCode: "wpc_decking",
    subcategoryName: "WPC decking",
    subcategoryNameZh: "木塑地板",
    profileKey: "construction.material.wpc_decking.v1",
    name: "Construction / Building material / WPC decking",
    nameZh: "建材 / 建筑材料 / 木塑地板",
    regulationBasis: "ESPR and construction product documentation readiness",
    granularityLevels: ["model", "batch"],
  },
  {
    sectorCode: "consumer_electronics",
    sectorName: "Consumer electronics",
    sectorNameZh: "消费电子",
    categoryCode: "audio_device",
    categoryName: "Audio device",
    categoryNameZh: "音频设备",
    subcategoryCode: "audio_device",
    subcategoryName: "Audio device",
    subcategoryNameZh: "音频设备",
    profileKey: "consumer_electronics.audio_device.v1",
    name: "Consumer electronics / Audio device",
    nameZh: "消费电子 / 音频设备",
    regulationBasis: "ESPR consumer electronics product group preparation",
    granularityLevels: ["model", "batch", "item"],
  },
];

export function findDppSectorProfile(profileKey?: string | null) {
  return DPP_SECTOR_PROFILES.find((profile) => profile.profileKey === profileKey) || null;
}

export function uniqueByCode<T>(items: T[], codeKey: keyof T) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const code = String(item[codeKey] || "");
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}
