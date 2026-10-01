/* Apply only approved Round E.1 public catalog descriptions to Hosted PreProd. */
import { execFileSync } from "node:child_process";

const projectRef = "efhiaufukjchxqhbmpvq";
const apply = process.argv.includes("--apply-round-e1-demo-copy");
if (!apply) throw new Error("REFUSED: pass --apply-round-e1-demo-copy.");
if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes(projectRef)) {
  throw new Error("REFUSED: Round E.1 catalog copy is restricted to Hosted PreProd.");
}
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
async function query(sql, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Round E.1 PreProd catalog update failed (${response.status}): ${raw.slice(0, 600)}`);
  return raw ? JSON.parse(raw) : [];
}
const descriptions = new Map([
  ["DPP-GLR-LMT-000001", ["A lightweight e-bike battery pack designed for urban commuting.", "GLR-P25A 为城市通勤设计的轻型电助力单车电池包。"]],
  ["DPP-GLR-LMT-000002", ["A high-energy-density NMC battery pack for extended urban riding.", "GLR-S36B 采用高能量密度 NMC 电芯，适用于城市长续航骑行。"]],
  ["DPP-GLR-LMT-000003", ["A high-load battery pack designed for cargo and fleet operations.", "GLR-X48C 面向货运与车队运营的高负载电池包。"]],
  ["DPP-DEMO-ESS-000001", ["A 14.3 kWh LFP energy storage module for commercial and industrial applications.", "GreenVault 工商业场景的 14.3 kWh 磷酸铁锂储能模块。"]],
  ["DPP-DEMO-TEX-000001", ["An organic cotton basic T-shirt made with comfortable 180 g/m² fabric.", "EcoWeave 有机棉基础款 T 恤，采用 180 g/m² 舒适面料。"]],
  ["DPP-DEMO-CE-000001", ["Bluetooth wireless headphones with a recycled ABS enclosure.", "LoopSound 采用再生 ABS 外壳的蓝牙无线耳机。"]],
  ["DPP-DEMO-BLD-000001", ["Wood-plastic composite flooring with 52% recycled content.", "TerraDeck 再生材料含量 52% 的木塑复合地板。"]],
  ["DPP-DEMO-HW-000001", ["A precision alloy-steel tool set with replaceable bits.", "ForgeFix 批头可更换的合金钢精密工具套装。"]],
]);
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
for (const [identifier, [summaryEn, summaryZh]] of descriptions) {
  const updated = await query(`update public.demo_showcase_entry e set summary_en=${literal(summaryEn)}, summary_zh=${literal(summaryZh)} from public.dpp_passport p where p.id=e.passport_id and p.passport_identifier=${literal(identifier)} and e.is_public and e.is_demo and e.synthetic returning e.id`);
  if (updated.length !== 1) throw new Error(`REFUSED: expected exactly one public synthetic PreProd card for ${identifier}; updated ${updated.length}.`);
}
const rows = await query(`select p.passport_identifier,e.summary_en,e.summary_zh from public.demo_showcase_entry e join public.dpp_passport p on p.id=e.passport_id where p.passport_identifier = any(array[${Array.from(descriptions.keys()).map(literal).join(",")}]) order by p.passport_identifier`, true);
if (rows.length !== descriptions.size || rows.some((row) => row.summary_en !== descriptions.get(row.passport_identifier)?.[0] || row.summary_zh !== descriptions.get(row.passport_identifier)?.[1])) {
  throw new Error("REFUSED: Post-update catalog verification failed.");
}
process.stdout.write(JSON.stringify({ projectRef, updatedCards: rows.length, identifiers: rows.map((row) => row.passport_identifier) }) + "\n");
