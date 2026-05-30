"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          email: "邮箱",
          password: "密码",
          submit: "登录",
          submitting: "登录中...",
        }
      : {
          email: "Email",
          password: "Password",
          submit: "Login",
          submitting: "Logging in...",
        };

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMsg(null);

    const form = new FormData(e.currentTarget);

    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();

    const { error } = await createSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMsg(error.message);
    else setMsg(null);

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form
        onSubmit={handleLogin}
        className="card w-full max-w-md space-y-4 p-6 shadow-lg"
      >
        <h2 className="text-2xl font-bold">GreenLean DPP</h2>

        <div>
          <label className="label">{t.email}</label>
          <input name="email" type="email" required className="input mt-1" />
        </div>

        <div>
          <label className="label">{t.password}</label>
          <input
            name="password"
            type="password"
            required
            className="input mt-1"
          />
        </div>

        <button disabled={loading} className="btn-primary w-full" type="submit">
          {loading ? t.submitting : t.submit}
        </button>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </div>
  );
}