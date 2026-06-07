"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Field = {
  name: string;
  label: string;
  labelZh: string;
  required?: boolean;
  type?: "text" | "number" | "date" | "datetime-local" | "url" | "email" | "textarea" | "checkbox";
};

type Props = {
  productId: string;
  title: string;
  titleZh: string;
  table: string;
  fields: Field[];
  displayFields: string[];
  orderBy?: string;
};

function displayValue(row: any, key: string) {
  const value = row?.[key];
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function inputValue(row: any, field: Field) {
  const value = row?.[field.name];
  if (value === null || value === undefined) return "";
  if (field.type === "datetime-local") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 16);
  }
  if (field.type === "date") return String(value).slice(0, 10);
  return String(value);
}

function getPayloadFromForm(form: FormData, fields: Field[], productId?: string) {
  const payload: Record<string, any> = productId ? { product_id: productId } : {};
  fields.forEach((field) => {
    if (field.type === "checkbox") {
      payload[field.name] = form.get(field.name) === "on";
    } else {
      const raw = String(form.get(field.name) || "").trim();
      payload[field.name] = field.type === "number" ? (raw === "" ? null : Number(raw)) : raw === "" ? null : raw;
    }
  });
  return payload;
}

export function ProductRelatedManager({ productId, title, titleZh, table, fields, displayFields, orderBy = "created_at" }: Props) {
  const { locale } = useLanguage();
  const supabase = createSupabaseClient();
  const shownTitle = locale === "zh" ? titleZh : title;
  const t = locale === "zh"
    ? { add: "新增", save: "保存", saving: "保存中...", search: "搜索", refresh: "刷新", edit: "编辑", cancel: "取消", update: "保存修改", delete: "删除", confirmDelete: "确定删除这条记录吗？", noRecords: "暂无记录。", loading: "加载中...", saved: "已保存。", updated: "已更新。", records: "条记录" }
    : { add: "Add", save: "Save", saving: "Saving...", search: "Search", refresh: "Refresh", edit: "Edit", cancel: "Cancel", update: "Save Changes", delete: "Delete", confirmDelete: "Delete this record?", noRecords: "No records yet.", loading: "Loading...", saved: "saved.", updated: "updated.", records: "records" };

  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");
    let request = supabase.from(table).select("*").eq("product_id", productId);
    if (orderBy) request = request.order(orderBy, { ascending: orderBy.includes("date") });
    const { data, error } = await request.limit(100);
    if (error) setMessage(error.message);
    else setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [productId, table]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(keyword));
  }, [rows, query]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const payload = getPayloadFromForm(form, fields, productId);
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from(table).insert(payload);
    if (error) setMessage(error.message);
    else {
      setMessage(`${shownTitle} ${t.saved}`);
      formEl.reset();
      await load();
    }
    setSaving(false);
  }

  async function update(id: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = getPayloadFromForm(form, fields);
    setSaving(true);
    setMessage("");
    const { error } = await supabase.from(table).update(payload).eq("id", id).eq("product_id", productId);
    if (error) setMessage(error.message);
    else {
      setMessage(`${shownTitle} ${t.updated}`);
      setEditingId(null);
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!window.confirm(t.confirmDelete)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage(error.message);
    else await load();
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-xl font-black text-slate-950">{shownTitle}</h2><p className="mt-1 text-sm text-slate-500">{filteredRows.length} {t.records}</p></div>
        <button onClick={load} type="button" className="btn-secondary py-2">{t.refresh}</button>
      </div>
      <form onSubmit={create} className="mt-5 grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const label = locale === "zh" ? field.labelZh : field.label;
          if (field.type === "textarea") return <label key={field.name} className="md:col-span-2"><span className="label">{label}</span><textarea name={field.name} required={field.required} placeholder={label} className="input mt-1 min-h-24" /></label>;
          if (field.type === "checkbox") return <label key={field.name} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"><input name={field.name} type="checkbox" className="h-4 w-4" />{label}</label>;
          return <label key={field.name}><span className="label">{label}</span><input name={field.name} required={field.required} type={field.type || "text"} placeholder={label} className="input mt-1" /></label>;
        })}
        <button disabled={saving} className="btn-primary md:col-span-2">{saving ? t.saving : `${t.add} ${shownTitle}`}</button>
      </form>
      {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
      <div className="mt-6"><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${t.search} ${shownTitle}...`} /></div>
      {loading ? <div className="mt-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div> :
        <div className="mt-5 divide-y divide-slate-200">
          {filteredRows.map((row) => (
            <div key={row.id} className="py-4">
              {editingId === row.id ? (
                <form onSubmit={(event) => update(row.id, event)} className="grid gap-4 rounded-2xl border border-green-100 bg-green-50/40 p-4 md:grid-cols-2">
                  {fields.map((field) => {
                    const label = locale === "zh" ? field.labelZh : field.label;
                    if (field.type === "textarea") {
                      return (
                        <label key={field.name} className="md:col-span-2">
                          <span className="label">{label}</span>
                          <textarea name={field.name} required={field.required} defaultValue={inputValue(row, field)} className="input mt-1 min-h-24" />
                        </label>
                      );
                    }
                    if (field.type === "checkbox") {
                      return (
                        <label key={field.name} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                          <input name={field.name} type="checkbox" defaultChecked={Boolean(row[field.name])} className="h-4 w-4" />
                          {label}
                        </label>
                      );
                    }
                    return (
                      <label key={field.name}>
                        <span className="label">{label}</span>
                        <input name={field.name} required={field.required} type={field.type || "text"} defaultValue={inputValue(row, field)} className="input mt-1" />
                      </label>
                    );
                  })}
                  <div className="flex flex-wrap gap-3 md:col-span-2">
                    <button disabled={saving} className="btn-primary" type="submit">{saving ? t.saving : t.update}</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary" type="button">{t.cancel}</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-950">{displayValue(row, displayFields[0])}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {displayFields.slice(1).map((field) => <span key={field} className="rounded-full bg-slate-100 px-3 py-1">{field}: {displayValue(row, field)}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditingId(row.id)} className="btn-secondary py-2">{t.edit}</button>
                    <button type="button" onClick={() => remove(row.id)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">{t.delete}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!filteredRows.length && <p className="py-8 text-center text-sm text-slate-500">{t.noRecords}</p>}
        </div>}
    </section>
  );
}
