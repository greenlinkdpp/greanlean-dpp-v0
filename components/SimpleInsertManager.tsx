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
  fixedValues?: Record<string, any>;
  filterColumn?: string;
  filterValue?: string;
  pageSize?: number;
};

function getPrimaryText(row: any) {
  return (
    row.supplier_name ||
    row.material_name ||
    row.certificate_name ||
    row.verified_by ||
    row.methodology ||
    row.name ||
    row.id
  );
}

function getSecondaryText(row: any) {
  const parts = [
    row.country,
    row.city,
    row.material_type,
    row.origin_country,
    row.certificate_type,
    row.issuer,
    row.verification_status,
    row.percentage ? `${row.percentage}%` : "",
    row.carbon_footprint ? `CO₂ ${row.carbon_footprint}` : "",
    row.water_usage ? `Water ${row.water_usage}` : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

function SkeletonRows() {
  return (
    <div className="mt-4 space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl bg-slate-100 p-5">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export function SimpleInsertManager({
  title,
  table,
  fields,
  fixedValues = {},
  filterColumn,
  filterValue,
  pageSize = 8,
}: Props) {
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
          previous: "上一页",
          next: "下一页",
          page: "页",
          errorPrefix: "错误：",
        }
      : {
          add: "Add",
          createNew: "Create a new record",
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
          previous: "Previous",
          next: "Next",
          page: "Page",
          errorPrefix: "Error: ",
        };

  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  async function load(nextPage = page) {
    setLoading(true);
    setMsg(null);

    const from = (nextPage - 1) * pageSize;
    const to = from + pageSize;

    let request = createSupabaseClient()
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filterColumn && filterValue) {
      request = request.eq(filterColumn, filterValue);
    }

    if (query.trim()) {
      const keyword = `%${query.trim()}%`;
      const searchableFields = fields.filter((field) => field.type !== "number" && field.type !== "date");
      if (searchableFields.length) {
        request = request.or(searchableFields.map((field) => `${field.name}.ilike.${keyword}`).join(","));
      }
    }

    const { data, error } = await request;

    if (error) {
      setMsg({ type: "err", text: t.errorPrefix + error.message });
      setRows([]);
      setHasNextPage(false);
    } else {
      const result = data || [];
      setRows(result.slice(0, pageSize));
      setHasNextPage(result.length > pageSize);
    }

    setLoading(false);
  }

  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filterColumn, filterValue, query, locale]);

  const filteredRows = useMemo(() => rows, [rows]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const payload: Record<string, any> = { ...fixedValues };

    fields.forEach((field) => {
      const value = String(form.get(field.name) || "").trim();

      if (field.type === "number") {
        payload[field.name] = value === "" ? null : Number(value);
      } else if (field.type === "date") {
        payload[field.name] = value || null;
      } else {
        payload[field.name] = value;
      }
    });

    setSaving(true);
    setMsg(null);

    const { error } = await createSupabaseClient().from(table).insert(payload);

    if (error) {
      setMsg({ type: "err", text: t.errorPrefix + error.message });
    } else {
      setMsg({ type: "ok", text: `${title} ${t.saved}` });
      formEl.reset();
      setPage(1);
      await load(1);
    }

    setSaving(false);
  }

  async function remove(id: string) {
    if (!window.confirm(t.confirmDelete)) return;

    setMsg(null);

    const { error } = await createSupabaseClient().from(table).delete().eq("id", id);

    if (error) {
      setMsg({ type: "err", text: t.errorPrefix + error.message });
    } else {
      await load(page);
    }
  }

  function goPrevious() {
    const next = Math.max(1, page - 1);
    setPage(next);
    load(next);
  }

  function goNext() {
    const next = page + 1;
    setPage(next);
    load(next);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <form onSubmit={create} className="card space-y-4">
        <div>
          <h2 className="text-xl font-bold">
            {t.add} {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{t.createNew}</p>
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

        {msg && (
          <p className={msg.type === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
            {msg.text}
          </p>
        )}
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

          <button onClick={() => load(page)} className="btn-secondary py-2">
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
          <SkeletonRows />
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
