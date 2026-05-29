"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
      setMsg("Product created.");
      formEl.reset();
      await load();
    }

    setLoading(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <form onSubmit={createProduct} className="card space-y-4">
        <h2 className="text-xl font-bold">Create Product</h2>

        <input className="input" name="name" placeholder="Product name" required />
        <input className="input" name="sku" placeholder="SKU" />
        <input className="input" name="brand" placeholder="Brand" />
        <input className="input" name="category" placeholder="Category" />
        <textarea
          className="input min-h-28"
          name="description"
          placeholder="Description"
        />

        <button disabled={loading} className="btn-primary w-full">
          {loading ? "Creating..." : "Create & Publish DPP"}
        </button>

        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </form>

      <div className="card">
        <h2 className="text-xl font-bold">Products</h2>

        <div className="mt-4 divide-y divide-slate-200">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-slate-500">
                  {p.sku || "No SKU"} · {p.status}
                </p>
              </div>

              {p.public_slug && (
                <Link
                  className="btn-secondary py-2"
                  href={`/p/${p.public_slug}`}
                  target="_blank"
                >
                  View DPP
                </Link>
              )}
            </div>
          ))}

          {!products.length && (
            <p className="py-8 text-slate-500">No products yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}