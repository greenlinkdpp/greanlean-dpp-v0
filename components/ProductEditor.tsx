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
  const supabase = createSupabaseClient();

  const [product, setProduct] = useState<Product | null>(null);

  const [materials, setMaterials] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [esg, setEsg] = useState<any | null>(null);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadProduct() {
    setLoading(true);

    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    setProduct(data);

    const materialsRes = await supabase
      .from("product_materials")
      .select("*")
      .eq("product_id", productId);

    setMaterials(materialsRes.data || []);

    const certRes = await supabase
      .from("product_certificates")
      .select("*")
      .eq("product_id", productId);

    setCertificates(certRes.data || []);

    const esgRes = await supabase
      .from("product_esg_metrics")
      .select("*")
      .eq("product_id", productId)
      .single();

    setEsg(esgRes.data || null);

    setLoading(false);
  }

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function saveProduct(
    event: React.FormEvent<HTMLFormElement>
  ) {
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

    const { error } = await supabase
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

  async function addMaterial(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    await supabase.from("product_materials").insert({
      product_id: productId,
      material_name: form.get("material_name"),
      material_type: form.get("material_type"),
      percentage: Number(form.get("percentage")),
      origin_country: form.get("origin_country"),
    });

    e.currentTarget.reset();

    await loadProduct();
  }

  async function addCertificate(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    await supabase.from("product_certificates").insert({
      product_id: productId,
      certificate_name: form.get("certificate_name"),
      certificate_type: form.get("certificate_type"),
      issuer: form.get("issuer"),
    });

    e.currentTarget.reset();

    await loadProduct();
  }

  async function saveEsg(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const payload = {
      product_id: productId,
      carbon_footprint: Number(
        form.get("carbon_footprint")
      ),
      water_usage: Number(form.get("water_usage")),
      recycled_content: Number(
        form.get("recycled_content")
      ),
      methodology: String(
        form.get("methodology") || ""
      ),
    };

    if (esg?.id) {
      await supabase
        .from("product_esg_metrics")
        .update(payload)
        .eq("id", esg.id);
    } else {
      await supabase
        .from("product_esg_metrics")
        .insert(payload);
    }

    await loadProduct();
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!product) {
    return <p>Product not found.</p>;
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/products"
            className="text-sm text-brand-700"
          >
            ← Back
          </Link>

          <h1 className="mt-3 text-3xl font-black">
            {product.name}
          </h1>

          <p className="mt-2 text-slate-500">
            DPP ID: {product.dpp_id}
          </p>
        </div>

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

      <form
        onSubmit={saveProduct}
        className="card space-y-4"
      >
        <h2 className="text-xl font-bold">
          Product Information
        </h2>

        <input
          className="input"
          name="name"
          defaultValue={product.name || ""}
          placeholder="Product name"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="input"
            name="sku"
            defaultValue={product.sku || ""}
            placeholder="SKU"
          />

          <input
            className="input"
            name="brand"
            defaultValue={product.brand || ""}
            placeholder="Brand"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="input"
            name="category"
            defaultValue={product.category || ""}
            placeholder="Category"
          />

          <input
            className="input"
            name="subcategory"
            defaultValue={product.subcategory || ""}
            placeholder="Subcategory"
          />
        </div>

        <textarea
          className="input min-h-36"
          name="description"
          defaultValue={product.description || ""}
          placeholder="Description"
        />

        <input
          className="input"
          name="main_image"
          defaultValue={product.main_image || ""}
          placeholder="Main image URL"
        />

        <select
          className="input"
          name="status"
          defaultValue={product.status || "draft"}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>

        <button className="btn-primary">
          {saving ? "Saving..." : "Save Product"}
        </button>

        {msg && (
          <p className="text-sm text-slate-500">
            {msg}
          </p>
        )}
      </form>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-bold">
            Materials
          </h2>

          <form
            onSubmit={addMaterial}
            className="mt-4 space-y-3"
          >
            <input
              className="input"
              name="material_name"
              placeholder="Material name"
              required
            />

            <input
              className="input"
              name="material_type"
              placeholder="Material type"
            />

            <input
              className="input"
              name="percentage"
              placeholder="Percentage"
              type="number"
            />

            <input
              className="input"
              name="origin_country"
              placeholder="Origin country"
            />

            <button className="btn-primary">
              Add Material
            </button>
          </form>

          <div className="mt-6 divide-y">
            {materials.map((m) => (
              <div
                key={m.id}
                className="py-3"
              >
                <p className="font-semibold">
                  {m.material_name}
                </p>

                <p className="text-sm text-slate-500">
                  {m.percentage}% ·{" "}
                  {m.origin_country}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold">
            Certificates
          </h2>

          <form
            onSubmit={addCertificate}
            className="mt-4 space-y-3"
          >
            <input
              className="input"
              name="certificate_name"
              placeholder="Certificate name"
              required
            />

            <input
              className="input"
              name="certificate_type"
              placeholder="Certificate type"
            />

            <input
              className="input"
              name="issuer"
              placeholder="Issuer"
            />

            <button className="btn-primary">
              Add Certificate
            </button>
          </form>

          <div className="mt-6 divide-y">
            {certificates.map((c) => (
              <div
                key={c.id}
                className="py-3"
              >
                <p className="font-semibold">
                  {c.certificate_name}
                </p>

                <p className="text-sm text-slate-500">
                  {c.issuer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold">
          ESG Metrics
        </h2>

        <form
          onSubmit={saveEsg}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <input
            className="input"
            name="carbon_footprint"
            placeholder="Carbon footprint"
            defaultValue={
              esg?.carbon_footprint || ""
            }
          />

          <input
            className="input"
            name="water_usage"
            placeholder="Water usage"
            defaultValue={esg?.water_usage || ""}
          />

          <input
            className="input"
            name="recycled_content"
            placeholder="Recycled content"
            defaultValue={
              esg?.recycled_content || ""
            }
          />

          <input
            className="input"
            name="methodology"
            placeholder="Methodology"
            defaultValue={esg?.methodology || ""}
          />

          <button className="btn-primary md:col-span-2">
            Save ESG Metrics
          </button>
        </form>
      </div>
    </div>
  );
}