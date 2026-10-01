import { execFileSync } from "node:child_process";

const projectRef = "efhiaufukjchxqhbmpvq";
const expected = [
  "DPP-GLR-LMT-000001", "DPP-GLR-LMT-000002", "DPP-GLR-LMT-000003", "DPP-DEMO-ESS-000001",
  "DPP-DEMO-TEX-000001", "DPP-DEMO-CE-000001", "DPP-DEMO-BLD-000001", "DPP-DEMO-HW-000001",
];
if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)) throw new Error("REFUSED: Hosted PreProd is required.");
const token = process.env.SUPABASE_ACCESS_TOKEN || execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"], { encoding: "utf8" }).trim();
async function query(sql, readOnly = false) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query: sql, read_only: readOnly }), signal: AbortSignal.timeout(120_000) });
  const raw = await response.text();
  if (!response.ok) throw new Error(`PreProd query failed (${response.status}): ${raw.slice(0, 800)}`);
  return raw ? JSON.parse(raw) : [];
}
const values = expected.map((identifier, index) => `('${identifier}', ${(index + 1) * 10})`).join(",");
const rows = await query(`
  with requested(passport_identifier, sort_order) as (values ${values}),
  updated as (
    update public.demo_showcase_entry entry
    set sort_order = requested.sort_order
    from public.dpp_passport passport, requested
    where passport.id = entry.passport_id and passport.passport_identifier = requested.passport_identifier
    returning entry.id
  )
  select count(*)::int as updated_count from updated;
`);
if (rows[0]?.updated_count !== 8) throw new Error(`Expected eight approved Demo entries, updated ${rows[0]?.updated_count ?? "unknown"}.`);
const ordered = await query(`
  select passport.passport_identifier, entry.category_code, entry.sort_order
  from public.demo_showcase_entry entry join public.dpp_passport passport on passport.id = entry.passport_id
  where entry.is_public and entry.is_demo and entry.synthetic
  order by entry.sort_order, entry.id;
`, true);
if (JSON.stringify(ordered.map((row) => row.passport_identifier)) !== JSON.stringify(expected)) throw new Error(`PreProd Demo order mismatch: ${JSON.stringify(ordered)}`);
process.stdout.write(`${JSON.stringify({ result: "PASS", ordered })}\n`);
