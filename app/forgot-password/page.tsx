"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const { locale } = useLanguage();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "working" | "sent">("idle");
  const copy = locale === "zh"
    ? { title: "重置密码", intro: "输入账号邮箱，我们会发送密码重置邮件。", email: "邮箱", submit: "发送重置邮件", working: "发送中…", sent: "如果该邮箱对应有效账户，我们会发送密码重置邮件。", back: "返回登录" }
    : { title: "Reset your password", intro: "Enter your account email and we will send a password reset email.", email: "Email", submit: "Send reset email", working: "Sending…", sent: "If this email belongs to a valid account, we will send a password reset email.", back: "Back to login" };

  useEffect(() => { document.title = `${copy.title} | GREANLEAN DPP`; }, [copy.title]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("working");
    try {
      await createSupabaseClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password?lang=${locale}` });
    } catch {
      // Keep the response neutral to prevent account enumeration.
    } finally { setState("sent"); }
  }

  return <main className="relative grid min-h-screen place-items-center bg-slate-950 px-6 py-20"><div className="absolute right-6 top-6"><LanguageSwitcher /></div><section className="relative w-full max-w-lg rounded-lg border border-white/10 bg-white p-8 shadow-2xl lg:p-10"><div className="inline-flex rounded-[14px] bg-white"><BrandLogo href={`/?lang=${locale}`} size="lg" /></div><h1 className="mt-8 text-3xl font-black text-slate-950">{copy.title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{copy.intro}</p>{state === "sent" ? <div role="status" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{copy.sent}</div> : <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5"><div><label htmlFor="reset-email" className="label">{copy.email}</label><input id="reset-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-1" /></div><button disabled={state === "working"} className="btn-primary w-full" type="submit">{state === "working" ? copy.working : copy.submit}</button></form>}<a href={`/login?lang=${locale}`} className="mt-6 block text-center text-sm font-semibold text-emerald-700 underline underline-offset-4">{copy.back}</a></section></main>;
}
