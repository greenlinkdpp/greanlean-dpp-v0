"use client";

import { createSupabaseClient } from "@/lib/supabase";

export async function authenticatedFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { data, error } = await createSupabaseClient().auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Authentication is required.");
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error?.message || "The request could not be completed.");
  return payload?.data as T;
}
