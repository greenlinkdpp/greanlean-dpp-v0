"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  status: string | null;
  dpp_id: string | null;
  public_slug: string | null;
  main_image: string | null;
};

export function ProductEditor({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadProduct() {
    setLoading(true);

    const { data, error } = await createSupabaseClient()
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      setMsg(error.message);
    } else {
      setProduct(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!product) return;

    setSaving(true);
    setMsg("");

    const form = new FormData(event.currentTarget);

    const payload = {
      name: String(form.get("name") || "").trim(),
      sku: String(form.get("sku") || "").trim(),
      brand: String(form.get("brand") || "").trim(),
      category: String(form.get("category") || "").trim(),
      subcategory: String(form.get("subcategory") || "").trim(),
      description: String(form.get("description") || "").trim(),
      status: String(form.get("status") || "draft"),
      main_image: String(form.get("main_image") || "").trim(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await createSupabaseClient()
      .from("products")
      .update(payload)
      .eq("id", product.id);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Product updated.");
      await loadProduct();
    }

    setSaving(false);
  }

  if (loading) {
    return <p className="text-slate-600">Loading product...</p>;
  }

  if (!product) {
    return <p className="text-red-600">Product not found.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/products"
            className="text-sm font-semibold text-brand-700"
          >
            ← Back to products
          </Link>

          <h1 className="mt-3 text-3xl font-black">Edit Product</h1>

          <p className="mt-2 text-slate-600">
            DPP ID: {product.dpp_id || "Not generated"}
          </p>
        </div>

        <div className="flex gap-3">
          {product.public_slug && (
            <Link
              href={`/p/${product.public_slug}`}
              target="_blank"
              className="btn-secondary"
            >
              View Public DPP
            </Link>
          )}
        </div>
      </div>

      <form
        onSubmit={saveProduct}
        className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"
      >
        <div className="card space-y-5">
          <h2 className="text-xl font-bold">Basic Information</h2>

          <div>
            <label className="label">Product Name</label>
            <input
              className="input mt-1"
              name="name"
              defaultValue={product.name || ""}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">SKU</label>
              <input
                className="input mt-1"
                name="sku"
                defaultValue={product.sku || ""}
              />
            </div>

            <div>
              <label className="label">Brand</label>
              <input
                className="input mt-1"
                name="brand"
                defaultValue={product.brand || ""}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <input
                className="input mt-1"
                name="category"
                defaultValue={product.category || ""}
              />
            </div>

            <div>
              <label className="label">Subcategory</label>
              <input
                className="input mt-1"
                name="subcategory"
                defaultValue={product.subcategory || ""}
              />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input mt-1 min-h-36"
              name="description"
              defaultValue={product.description || ""}
            />
          </div>

          <div>
            <label className="label">Main Image URL</label>
            <input
              className="input mt-1"
              name="main_image"
              defaultValue={product.main_image || ""}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="card h-fit space-y-5">
          <h2 className="text-xl font-bold">Publishing</h2>

          <div>
            <label className="label">Status</label>
            <select
              className="input mt-1"
              name="status"
              defaultValue={product.status || "draft"}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div>
            <label className="label">Public Slug</label>
            <input
              className="input mt-1"
              value={product.public_slug || ""}
              disabled
            />
          </div>

          <button disabled={saving} className="btn-primary w-full">
            {saving ? "Saving..." : "Save Product"}
          </button>

          {msg && <p className="text-sm text-slate-600">{msg}</p>}
        </div>
      </form>
    </div>
  );
}