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
};

export function ProductManager() {
  const { locale } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
          created: "Product created.",
        };

  async function load() {
    const { data, error } = await createSupabaseClient()
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setProducts(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget;
    const f = new FormData(formEl);

    setLoading(true);
    setMsg("");

    const name = String(f.get("name") || "").trim();
    const sku = String(f.get("sku") || "").trim();
    const brand = String(f.get("brand") || "").trim();
    const category = String(f.get("category") || "").trim();
    const description = String(f.get("description") || "").trim();

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
      setMsg(error.message);
    } else {
      setMsg(t.created);
      formEl.reset();
      await load();
    }

    setLoading(false);
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

        <button disabled={loading} className="btn-primary w-full">
          {loading ? t.creating : t.createAndPublish}
        </button>

        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </form>

      <div className="card">
        <h2 className="text-xl font-bold">{t.products}</h2>

        <div className="mt-4 divide-y divide-slate-200">
          {products.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-slate-500">
                  {p.sku || t.noSku} · {p.status}
                </p>
              </div>

              <div className="flex gap-2">
                <Link className="btn-secondary py-2" href={`/dashboard/products/${p.id}`}>
                  {t.edit}
                </Link>

                {p.public_slug && (
                  <Link className="btn-secondary py-2" href={`/p/${p.public_slug}`} target="_blank">
                    {t.viewDpp}
                  </Link>
                )}
              </div>
            </div>
          ))}

          {!products.length && <p className="py-8 text-slate-500">{t.empty}</p>}
        </div>
      </div>
    </div>
  );
}