"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Supplier = {
  id: string;
  supplier_name: string;
  supplier_type: string | null;
  country: string | null;
  city: string | null;
};

type Product = {
  id: string;
  name: string;
  name_zh: string | null;
  sku: string | null;
  dpp_id: string | null;
  public_slug: string | null;
  category: string | null;
};

type LinkRow = {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_role: string | null;
  relationship_status: string | null;
  notes: string | null;
  notes_zh: string | null;
  created_at: string;
};

export function SupplierProductManager() {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const t =
    locale === "zh"
      ? {
          title: "供应商关联产品",
          subtitle: "把供应商和对应产品绑定，后续可以按供应商管理 DPP 数据、证据和责任边界。",
          supplier: "供应商",
          product: "产品",
          role: "供应商角色",
          rolePlaceholder: "例如：面料供应商 / 成衣制造商 / 辅料供应商",
          status: "状态",
          active: "合作中",
          inactive: "暂停",
          notes: "备注",
          bind: "绑定产品",
          binding: "绑定中...",
          linked: "已绑定产品",
          allSuppliers: "全部供应商",
          filterBySupplier: "按供应商筛选",
          refresh: "刷新",
          remove: "移除",
          empty: "暂无供应商产品关联。",
          selectSupplier: "选择供应商",
          selectProduct: "选择产品",
          saved: "已建立关联。",
          errorPrefix: "错误：",
          openDpp: "打开 DPP",
        }
      : {
          title: "Supplier Product Links",
          subtitle: "Link suppliers with products so DPP evidence, responsibilities and product scope can be managed by supplier.",
          supplier: "Supplier",
          product: "Product",
          role: "Supplier role",
          rolePlaceholder: "e.g. fabric supplier / garment manufacturer / trim supplier",
          status: "Status",
          active: "Active",
          inactive: "Inactive",
          notes: "Notes",
          bind: "Link Product",
          binding: "Linking...",
          linked: "Linked products",
          allSuppliers: "All suppliers",
          filterBySupplier: "Filter by supplier",
          refresh: "Refresh",
          remove: "Remove",
          empty: "No supplier-product links yet.",
          selectSupplier: "Select supplier",
          selectProduct: "Select product",
          saved: "Link created.",
          errorPrefix: "Error: ",
          openDpp: "Open DPP",
        };

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("all");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const supplierById = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier])), [suppliers]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const filteredLinks = useMemo(
    () => (selectedSupplierId === "all" ? links : links.filter((link) => link.supplier_id === selectedSupplierId)),
    [links, selectedSupplierId]
  );

  async function load() {
    setLoading(true);
    setMessage(null);

    const [supplierResult, productResult, linkResult] = await Promise.all([
      supabase
        .from("product_suppliers")
        .select("id, supplier_name, supplier_type, country, city")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("products")
        .select("id, name, name_zh, sku, dpp_id, public_slug, category")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("supplier_products")
        .select("id, supplier_id, product_id, supplier_role, relationship_status, notes, notes_zh, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (supplierResult.error || productResult.error || linkResult.error) {
      setMessage({
        type: "err",
        text:
          t.errorPrefix +
          (supplierResult.error?.message || productResult.error?.message || linkResult.error?.message || "Unknown error"),
      });
      setSuppliers([]);
      setProducts([]);
      setLinks([]);
    } else {
      setSuppliers(supplierResult.data || []);
      setProducts(productResult.data || []);
      setLinks(linkResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supplierId = String(form.get("supplier_id") || "");
    const productId = String(form.get("product_id") || "");
    if (!supplierId || !productId) return;

    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("supplier_products").upsert(
      {
        supplier_id: supplierId,
        product_id: productId,
        supplier_role: String(form.get("supplier_role") || "").trim() || null,
        relationship_status: String(form.get("relationship_status") || "active"),
        notes: String(form.get("notes") || "").trim() || null,
      },
      { onConflict: "supplier_id,product_id" }
    );

    if (error) {
      setMessage({ type: "err", text: t.errorPrefix + error.message });
    } else {
      setMessage({ type: "ok", text: t.saved });
      setSelectedSupplierId(supplierId);
      e.currentTarget.reset();
      await load();
    }

    setSaving(false);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("supplier_products").delete().eq("id", id);
    if (error) {
      setMessage({ type: "err", text: t.errorPrefix + error.message });
    } else {
      await load();
    }
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">{t.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.subtitle}</p>
        </div>
        <button onClick={load} className="btn-secondary py-2" type="button">
          {t.refresh}
        </button>
      </div>

      <form onSubmit={create} className="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_220px_150px]">
        <select className="input" name="supplier_id" required defaultValue="">
          <option value="" disabled>
            {t.selectSupplier}
          </option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.supplier_name}
            </option>
          ))}
        </select>
        <select className="input" name="product_id" required defaultValue="">
          <option value="" disabled>
            {t.selectProduct}
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {(locale === "zh" && product.name_zh ? product.name_zh : product.name) + (product.sku ? ` · ${product.sku}` : "")}
            </option>
          ))}
        </select>
        <input className="input" name="supplier_role" placeholder={t.rolePlaceholder} />
        <select className="input" name="relationship_status" defaultValue="active">
          <option value="active">{t.active}</option>
          <option value="inactive">{t.inactive}</option>
        </select>
        <textarea className="input min-h-20 lg:col-span-3" name="notes" placeholder={t.notes} />
        <button disabled={saving} className="btn-primary h-fit py-3" type="submit">
          {saving ? t.binding : t.bind}
        </button>
      </form>

      {message && (
        <p className={message.type === "ok" ? "mt-4 text-sm text-green-700" : "mt-4 text-sm text-red-600"}>{message.text}</p>
      )}

      <div className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold">{t.linked}</h3>
            <p className="mt-1 text-sm text-slate-500">{filteredLinks.length} / {links.length}</p>
          </div>
          <label className="min-w-[260px]">
            <span className="label">{t.filterBySupplier}</span>
            <select className="input mt-1" value={selectedSupplierId} onChange={(event) => setSelectedSupplierId(event.target.value)}>
              <option value="all">{t.allSuppliers}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.supplier_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredLinks.length ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {filteredLinks.map((link) => {
              const supplier = supplierById.get(link.supplier_id);
              const product = productById.get(link.product_id);
              const productName = product ? (locale === "zh" && product.name_zh ? product.name_zh : product.name) : link.product_id;
              const dppPath = product?.dpp_id || product?.public_slug;
              return (
                <article key={link.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{supplier?.supplier_name || link.supplier_id}</p>
                      <h4 className="mt-2 text-lg font-black text-slate-950">{productName}</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {[product?.sku, product?.category, link.supplier_role, link.relationship_status].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(link.id)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                      type="button"
                    >
                      {t.remove}
                    </button>
                  </div>
                  {(link.notes || link.notes_zh) && (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                      {locale === "zh" && link.notes_zh ? link.notes_zh : link.notes}
                    </p>
                  )}
                  {dppPath && (
                    <Link className="mt-4 inline-flex text-sm font-bold text-green-700" href={`/p/${encodeURIComponent(dppPath)}?lang=${locale}`} target="_blank">
                      {t.openDpp}
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">{t.empty}</p>
        )}
      </div>
    </section>
  );
}
