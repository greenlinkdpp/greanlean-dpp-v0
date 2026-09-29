"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/components/LanguageProvider";
import { createSupabaseClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const { locale } = useLanguage();
  const [ready, setReady] = useState(false); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [state, setState] = useState<"checking" | "ready" | "invalid" | "mismatch" | "working" | "success">("checking");
  const copy = locale === "zh"
    ? { title: "设置新密码", password: "新密码", confirmation: "确认新密码", submit: "更新密码", checking: "正在验证重置链接…", invalid: "此密码重置链接无效或已过期，请重新申请。", mismatch: "两次输入的密码不一致。", success: "密码已更新，正在返回登录。", back: "返回登录" }
    : { title: "Set a new password", password: "New password", confirmation: "Confirm new password", submit: "Update password", checking: "Validating reset link…", invalid: "This password reset link is invalid or expired. Request a new one.", mismatch: "The passwords do not match.", success: "Password updated. Returning to login.", back: "Back to login" };

  useEffect(() => {
    document.title = `${copy.title} | GREANLEAN DPP`;
    let active = true;
    createSupabaseClient().auth.getSession().then(({ data }) => { if (!active) return; setState(data.session ? "ready" : "invalid"); });
    return () => { active = false; };
  }, [copy.title]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (password !== confirmation) { setState("mismatch"); return; }
    setState("working");
    const { error } = await createSupabaseClient().auth.updateUser({ password });
    if (error) { setState("invalid"); return; }
    setState("success"); window.setTimeout(() => window.location.replace(`/login?lang=${locale}&reset=success`), 900);
  }

  return <main className="relative grid min-h-screen place-items-center bg-slate-950 px-6 py-20"><div className="absolute right-6 top-6"><LanguageSwitcher /></div><section className="relative w-full max-w-lg rounded-lg border border-white/10 bg-white p-8 shadow-2xl lg:p-10"><div className="inline-flex rounded-[14px] bg-white"><BrandLogo href={`/?lang=${locale}`} size="lg" /></div><h1 className="mt-8 text-3xl font-black text-slate-950">{copy.title}</h1>{state === "checking" && <p className="mt-4 text-sm text-slate-600">{copy.checking}</p>}{state === "invalid" && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{copy.invalid}</p>}{state === "mismatch" && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{copy.mismatch}</p>}{state === "success" && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{copy.success}</p>}{(state === "ready" || state === "working" || state === "mismatch") && <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5"><div><label htmlFor="new-password" className="label">{copy.password}</label><input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => { setPassword(event.target.value); if (state === "mismatch") setState("ready"); }} className="input mt-1" /></div><div><label htmlFor="confirm-password" className="label">{copy.confirmation}</label><input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); if (state === "mismatch") setState("ready"); }} className="input mt-1" /></div><button disabled={state === "working"} className="btn-primary w-full" type="submit">{copy.submit}</button></form>}<a href={`/login?lang=${locale}`} className="mt-6 block text-center text-sm font-semibold text-emerald-700 underline underline-offset-4">{copy.back}</a></section></main>;
}
