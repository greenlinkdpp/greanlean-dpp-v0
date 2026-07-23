import { createClient } from "@supabase/supabase-js";
import { ApiError } from "./apiRoute";

function configuration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing Supabase public configuration.");
  return { url, anonKey };
}

export function createServerAuthClient(accessToken: string) {
  const { url, anonKey } = configuration();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function createSupabasePublicServerClient() {
  const { url, anonKey } = configuration();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseAdminClient() {
  const { url } = configuration();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Missing server-only Supabase service role configuration.");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
  const accessToken = match[1];
  const authClient = createServerAuthClient(accessToken);
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) throw new ApiError(401, "INVALID_SESSION", "The session is invalid or expired.");
  return { user: data.user, accessToken };
}
