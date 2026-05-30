"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import { useLanguage } from "@/components/LanguageProvider";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  status: string | null;
  public_slug: string | null;
  created_at: string;
};

const PAGE_SIZE = 8;

function ProductSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-100 p-4">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function ProductManager() {
  const { locale } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hasNextPage, setHasNextPage] = useState(false);

  const t =
    locale === "zh"
      ? {
          createProduct: "创建产品",
          productName: "产品名称",
          sku: "SKU",
          brand: "品牌",
          category: "分类",
          description: "描述",
          createAndPublish: "创建并发布 DPP",
          creating: "创建中...",
          products: "产品列表",
          noSku: "无 SKU",
          edit: "编辑",
          viewDpp: "查看 DPP",
          empty: "暂无产品。",
          created: "产品已创建。",
          searchPlaceholder: "搜索产品名称、SKU、品牌...",
          previous: "上一页",
          next: "下一页",
          page: "页",
          refresh: "刷新",
          all: "全部",
          draft: "草稿",
          published: "已发布",
          required: "请填写产品名称。",
          status: "状态",
          delete: "删除",
          confirmDelete: "确定删除这个产品吗？相关材料、ESG 和证书也会被删除。",
          errorPrefix: "错误：",
        }
      : {
          createProduct: "Create Product",
          productName: "Product name",
          sku: "SKU",
          brand: "Brand",
          category: "Category",
          description: "Description",
          createAndPublish: "Create & Publish DPP",
          creating: "Creating...",
          products: "Products",
          noSku: "No SKU",
          edit: "Edit",
          viewDpp: "View DPP",
          empty: "No products yet.",
          searchPlaceholder: "Search name, SKU, brand...",
          previous: "Previous",
          next: "Next",
          page: "Page",
          refresh: "Refresh",
          all: "All",
          draft: "Draft",
          published: "Published",
          required: "Please enter product name.",
          status: "Status",
          delete: "Delete",
          confirmDelete: "Delete this product? Related materials, ESG and certificates may also be removed.",
          errorPrefix: "Error: ",
        };

  async function loadProducts(nextPage = page) {
    setLoading(true);
    setMsg(null);

    const from = (nextPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE;

    let request = createSupabaseClient()
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search.trim()) {
      const keyword = `%${search.trim()}%`;
      request = request.or(`name.ilike.${keyword},sku.ilike.${keyword},brand.ilike.${keyword},category.ilike.${keyword}`);
    }

    if (statusFilter !== "all") {
      request = request.eq("status", statusFilter);
    }

    const { data, error } = await request;

    if (error) {
      setProducts([]);
      setHasNextPage(false);
      setMsg({ type: "err", text: t.errorPrefix + error.message });
    } else {
      const result = data || [];
      setProducts(result.slice(0, PAGE_SIZE));
      setHasNextPage(result.length > PAGE_SIZE);
    }

    setLoading(false);
  }

  useEffect(() => {
    setPage(1);
    loadProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, locale]);

  async function createProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget;
    const f = new FormData(formEl);

    setCreating(true);
    setMsg(null);

    const name = String(f.get("name") || "").trim();
    const sku = String(f.get("sku") || "").trim();
    const brand = String(f.get("brand") || "").trim();
    const category = String(f.get("category") || "").trim();
    const description = String(f.get("description") || "").trim();

    if (!name) {
      setMsg({ type: "err", text: t.required });
      setCreating(false);
      return;
    }

    const public_slug = slugify(name + "-" + (sku || Date.now()));
    const dpp_id =
      "DPP-" + Math.random().toString(36).slice(2, 10).toUpperCase();

    const { error } = await createSupabaseClient().from("products").insert({
      name,
      sku,
      brand,
      category,
      description,
      public_slug,
      dpp_id,
      status: "published",
    });

    if (error) {
      setMsg({ type: "err", text: t.errorPrefix + error.message });
    } else {
      setMsg({ type: "ok", text: t.created });
      formEl.reset();
      setPage(1);
      await loadProducts(1);
    }

    setCreating(false);
  }

  async function deleteProduct(id: string) {
    if (!window.confirm(t.confirmDelete)) return;

    setMsg(null);

    const { error } = await createSupabaseClient().from("products").delete().eq("id", id);

    if (error) {
      setMsg({ type: "err", text: t.errorPrefix + error.message });
    } else {
      await loadProducts(page);
    }
  }

  function goPrevious() {
    const next = Math.max(1, page - 1);
    setPage(next);
    loadProducts(next);
  }

  function goNext() {
    const next = page + 1;
    setPage(next);
    loadProducts(next);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <form onSubmit={createProduct} className="card space-y-4">
        <h2 className="text-xl font-bold">{t.createProduct}</h2>

        <input className="input" name="name" placeholder={t.productName} required />
        <input className="input" name="sku" placeholder={t.sku} />
        <input className="input" name="brand" placeholder={t.brand} />
        <input className="input" name="category" placeholder={t.category} />
        <textarea className="input min-h-28" name="description" placeholder={t.description} />

        <button disabled={creating} className="btn-primary w-full">
          {creating ? t.creating : t.createAndPublish}
        </button>

        {msg && (
          <p className={msg.type === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
            {msg.text}
          </p>
        )}
      </form>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{t.products}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {t.page} {page}
            </p>
          </div>

          <button onClick={() => loadProducts(page)} className="btn-secondary py-2">
            {t.refresh}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
          <input
            className="input"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t.all}</option>
            <option value="published">{t.published}</option>
            <option value="draft">{t.draft}</option>
          </select>
        </div>

        <div className="mt-5 divide-y divide-slate-200">
          {loading ? (
            <ProductSkeleton />
          ) : products.length ? (
            products.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{p.name}</p>
                    <span className={p.status === "published" ? "rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700" : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"}>
                      {p.status === "published" ? t.published : t.draft}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {p.sku || t.noSku} · {p.brand || "-"} · {p.category || "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link className="btn-secondary py-2" href={`/dashboard/products/${p.id}`}>
                    {t.edit}
                  </Link>

                  {p.public_slug && (
                    <Link className="btn-secondary py-2" href={`/p/${p.public_slug}`} target="_blank">
                      {t.viewDpp}
                    </Link>
                  )}

                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-slate-500">{t.empty}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            disabled={page === 1 || loading}
            onClick={goPrevious}
            className="btn-secondary py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.previous}
          </button>

          <p className="text-sm text-slate-500">
            {t.page} {page}
          </p>

          <button
            disabled={!hasNextPage || loading}
            onClick={goNext}
            className="btn-secondary py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.next}
          </button>
        </div>
      </div>
    </div>
  );
}
