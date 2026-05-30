"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

type Field = {
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
};

type Props = {
  title: string;
  table: string;
  fields: Field[];
};

function getPrimaryText(row: any) {
  return (
    row.supplier_name ||
    row.material_name ||
    row.certificate_name ||
    row.verified_by ||
    row.methodology ||
    row.id
  );
}

function getSecondaryText(row: any) {
  return (
    row.country ||
    row.city ||
    row.material_type ||
    row.certificate_type ||
    row.issuer ||
    row.origin_country ||
    row.verification_status ||
    ""
  );
}

export function SimpleInsertManager({ title, table, fields }: Props) {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          add: "新增",
          createNew: "创建新记录",
          save: "保存",
          saving: "保存中...",
          records: "记录",
          recordCount: "条记录",
          refresh: "刷新",
          search: "搜索",
          loading: "加载中...",
          noDetails: "暂无详情",
          delete: "删除",
          confirmDelete: "确定删除这条记录吗？",
          noRecords: "暂无记录。",
          saved: "已保存。",
        }
      : {
          add: "Add",
          createNew: "Create a new record in",
          save: "Save",
          saving: "Saving...",
          records: "Records",
          recordCount: "record(s)",
          refresh: "Refresh",
          search: "Search",
          loading: "Loading...",
          noDetails: "No details",
          delete: "Delete",
          confirmDelete: "Delete this record?",
          noRecords: "No records found.",
          saved: "saved.",
        };

  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");

    const { data, error } = await createSupabaseClient()
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) setMsg(error.message);
    else setRows(data || []);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [table]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(keyword));
  }, [rows, query]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const payload: Record<string, any> = {};

    fields.forEach((field) => {
      const value = String(form.get(field.name) || "").trim();
      payload[field.name] = field.type === "number" ? (value === "" ? null : Number(value)) : value;
    });

    setSaving(true);
    setMsg("");

    const { error } = await createSupabaseClient().from(table).insert(payload);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg(`${title} ${t.saved}`);
      formEl.reset();
      await load();
    }

    setSaving(false);
  }

  async function remove(id: string) {
    if (!window.confirm(t.confirmDelete)) return;

    const { error } = await createSupabaseClient().from(table).delete().eq("id", id);

    if (error) setMsg(error.message);
    else await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <form onSubmit={create} className="card space-y-4">
        <div>
          <h2 className="text-xl font-bold">
            {t.add} {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t.createNew} {table}.
          </p>
        </div>

        {fields.map((field) => (
          <input
            key={field.name}
            className="input"
            name={field.name}
            required={field.required}
            type={field.type || "text"}
            placeholder={field.placeholder}
          />
        ))}

        <button disabled={saving} className="btn-primary w-full">
          {saving ? t.saving : t.save}
        </button>

        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </form>

      <div className="card overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              {title} {t.records}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredRows.length} {t.recordCount}
            </p>
          </div>

          <button onClick={load} className="btn-secondary py-2">
            {t.refresh}
          </button>
        </div>

        <div className="mt-4">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t.search} ${title}...`}
          />
        </div>

        {loading ? (
          <p className="py-8 text-slate-500">{t.loading}</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-200">
            {filteredRows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold">{getPrimaryText(row)}</p>
                  <p className="text-sm text-slate-500">
                    {getSecondaryText(row) || t.noDetails}
                  </p>
                </div>

                <button
                  onClick={() => remove(row.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  {t.delete}
                </button>
              </div>
            ))}

            {!filteredRows.length && <p className="py-8 text-slate-500">{t.noRecords}</p>}
          </div>
        )}
      </div>
    </div>
  );
}