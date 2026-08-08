"use client";

import { createSupabaseClient } from "@/lib/supabase";

export type InternalWriteFilter = {
  column: string;
  operator: "eq" | "in";
  value: unknown;
};

export type InternalWriteRequest = {
  table: string;
  operation: "insert" | "update" | "delete" | "upsert";
  values?: Record<string, unknown> | Array<Record<string, unknown>>;
  filters?: InternalWriteFilter[];
  onConflict?: string;
  returning?: "none" | "single" | "rows";
};

type InternalWriteResult<T> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

export async function internalDataWrite<T = unknown>(
  input: InternalWriteRequest,
): Promise<InternalWriteResult<T>> {
  try {
    const supabase = createSupabaseClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      return {
        data: null,
        error: { message: sessionError?.message || "Authentication is required." },
      };
    }
    const response = await fetch("/api/internal/data-write", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        data: null,
        error: {
          message: body?.error?.message || "The data change could not be saved.",
          code: body?.error?.code,
        },
      };
    }
    return { data: (body?.data ?? null) as T | null, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : "The data change could not be saved.",
      },
    };
  }
}
