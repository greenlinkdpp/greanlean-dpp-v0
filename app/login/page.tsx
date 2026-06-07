"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { createSupabaseClient } from "@/lib/supabase";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
  const { locale } = useLanguage();
  const router = useRouter();

  const t =
    locale === "zh"
      ? {
          badge: "greanlean DPP",
          title: "登录 DPP 工作台",
          subtitle: "管理产品护照、批量导入数据、发布公开 DPP 页面。",
          email: "邮箱",
          password: "密码",
          submit: "登录",
          submitting: "登录中...",
          failed: "登录失败：",
          note: "当前阶段用于总管理员和早期客户账号。",
          hub: "DPP 数据中心",
          importFlow: "批量导入流程",
          publish: "公开产品护照发布",
        }
      : {
          badge: "greanlean DPP",
          title: "Login to DPP Workspace",
          subtitle: "Manage product passports, bulk import data and publish public DPP pages.",
          email: "Email",
          password: "Password",
          submit: "Login",
          submitting: "Logging in...",
          failed: "Login failed: ",
          note: "For admin and early customer accounts in the current phase.",
          hub: "DPP data hub",
          importFlow: "Bulk import workflow",
          publish: "Public passport publishing",
        };

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = locale === "zh" ? "登录 DPP 工作台 | GREANLEAN DPP" : "Login | GREANLEAN DPP";
  }, [locale]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMsg(null);

    const form = new FormData(e.currentTarget);

    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();

    try {
      const { error } = await createSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg(t.failed + error.message);
        return;
      }

      router.push(`/dashboard?lang=${locale}`);
      router.refresh();
    } catch (error) {
      setMsg(
        t.failed +
          (error instanceof Error && error.message
            ? error.message
            : "Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(54,179,126,0.25),transparent_34%),linear-gradient(135deg,#020617,#0f172a_55%,#111827)]" />
      <div className="absolute right-6 top-6">
        <LanguageSwitcher />
      </div>

      <main className="relative grid min-h-screen place-items-center px-6 py-20">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/10 bg-white shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
          <section className="bg-slate-950 p-8 text-white lg:p-10">
            <BrandLogo href={`/?lang=${locale}`} size="lg" markClassName="shadow-brand-500/20" />
            <h1 className="mt-6 text-4xl font-black leading-tight">{t.title}</h1>
            <p className="mt-4 leading-7 text-slate-300">{t.subtitle}</p>

            <div className="mt-10 grid gap-3 text-sm text-slate-300">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">{t.hub}</div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">{t.importFlow}</div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">{t.publish}</div>
            </div>
          </section>

          <form onSubmit={handleLogin} className="space-y-5 p-8 lg:p-10">
            <div>
              <h2 className="text-2xl font-black text-slate-950">{t.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t.note}</p>
            </div>

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
      </main>
    </div>
  );
}
