import { createSupabaseAdminClient } from "../supabase";

export type PublicDemoShowcaseEntry = {
  id: string;
  categoryCode: string;
  titleEn: string;
  titleZh: string;
  brand: string;
  summaryEn: string;
  summaryZh: string;
  keyParameters: Record<string, unknown>;
  coverStyle: string;
  featured: boolean;
  sortOrder: number;
  passportIdentifier: string;
};

/** Public catalog data is read with service authority, then explicitly shaped.
 * No workflow, tenant, author, or unpublished-version metadata crosses this boundary. */
export async function loadPublicDemoShowcase(): Promise<PublicDemoShowcaseEntry[]> {
  const admin = createSupabaseAdminClient();
  const { data: entries, error } = await admin.from("demo_showcase_entry")
    .select("id,passport_id,category_code,title_en,title_zh,brand,summary_en,summary_zh,key_parameters,cover_style,is_featured,sort_order")
    .eq("is_public", true).eq("is_demo", true).eq("synthetic", true)
    // sort_order is a deliberate cross-category product order. Category codes
    // are labels, not an alphabetical presentation contract.
    .order("sort_order").order("id");
  if (error || !entries?.length) return [];
  const passportIds = entries.map((entry: any) => entry.passport_id);
  const [{ data: passports }, { data: pointers }, { data: versions }] = await Promise.all([
    admin.from("dpp_passport").select("id,passport_identifier,status").in("id", passportIds).eq("status", "ACTIVE"),
    admin.from("dpp_current_pointer").select("passport_id,current_version_id").in("passport_id", passportIds),
    admin.from("dpp_version").select("id,passport_id,publication_state").in("passport_id", passportIds).eq("publication_state", "PUBLISHED"),
  ]);
  const passportById = new Map((passports || []).map((row: any) => [row.id, row]));
  const pointerByPassport = new Map((pointers || []).map((row: any) => [row.passport_id, row.current_version_id]));
  const publishedById = new Set((versions || []).map((row: any) => row.id));
  return entries.flatMap((entry: any) => {
    const passport = passportById.get(entry.passport_id);
    if (!passport || !publishedById.has(pointerByPassport.get(entry.passport_id))) return [];
    return [{
      id: entry.id, categoryCode: entry.category_code, titleEn: entry.title_en, titleZh: entry.title_zh,
      brand: entry.brand, summaryEn: entry.summary_en, summaryZh: entry.summary_zh,
      keyParameters: entry.key_parameters || {}, coverStyle: entry.cover_style, featured: entry.is_featured,
      sortOrder: entry.sort_order, passportIdentifier: passport.passport_identifier,
    }];
  });
}
