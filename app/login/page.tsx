"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
export default function LoginPage(){
  const router=useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setLoading(true); setError("");
    const f=new FormData(e.currentTarget);
    const {error}=await createSupabaseClient().auth.signInWithPassword({email:String(f.get("email")),password:String(f.get("password"))});
    if(error){setError(error.message);setLoading(false)}else router.push("/dashboard");
  }
  return <main className="grid min-h-screen place-items-center bg-slate-950 px-6"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl">
    <Link href="/" className="text-sm text-slate-300">← Back to site</Link><h1 className="mt-6 text-4xl font-black text-brand-500">GreenLean</h1><p className="mt-2 text-slate-400">DPP Admin Login</p>
    <div className="mt-8 space-y-4"><input className="input border-white/10 bg-white/10 text-white placeholder:text-slate-500" name="email" type="email" placeholder="Email" required/><input className="input border-white/10 bg-white/10 text-white placeholder:text-slate-500" name="password" type="password" placeholder="Password" required/><button disabled={loading} className="btn-primary w-full">{loading?"Logging in...":"Login"}</button>{error&&<p className="text-sm text-red-300">{error}</p>}</div>
  </form></main>
}
