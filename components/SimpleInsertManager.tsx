"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type Props = {
  title: string;
  table: string;
  fields: { name: string; placeholder: string; required?: boolean }[];
};

export function SimpleInsertManager({ title, table, fields }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await createSupabaseClient()
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    setRows(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formEl = e.currentTarget;
    const f = new FormData(formEl);

    setMsg("");

    const payload: Record<string, string> = {};

    fields.forEach((x) => {
      payload[x.name] = String(f.get(x.name) || "").trim();
    });

    const { error } = await createSupabaseClient().from(table).insert(payload);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg(`${title} saved.`);
      formEl.reset();
      await load();
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <form onSubmit={create} className="card space-y-4">
        <h2 className="text-xl font-bold">Add {title}</h2>

        {fields.map((f) => (
          <input
            key={f.name}
            className="input"
            name={f.name}
            required={f.required}
            placeholder={f.placeholder}
          />
        ))}

        <button className="btn-primary w-full">Save</button>

        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </form>

      <div className="card overflow-x-auto">
        <h2 className="text-xl font-bold">{title} Records</h2>

        <table className="mt-4 w-full text-left text-sm">
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 font-medium">
                  {row.supplier_name ||
                    row.material_name ||
                    row.certificate_name ||
                    row.verified_by ||
                    row.id}
                </td>
                <td className="py-3 text-slate-500">
                  {row.country ||
                    row.material_type ||
                    row.certificate_type ||
                    row.methodology ||
                    ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!rows.length && (
          <p className="py-8 text-slate-500">No records yet.</p>
        )}
      </div>
    </div>
  );
}