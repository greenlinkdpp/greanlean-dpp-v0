"use client";
import Link from "next/link"; import { usePathname,useRouter } from "next/navigation"; import clsx from "clsx"; import { createSupabaseClient } from "@/lib/supabase";
const nav=[["Overview","/dashboard"],["Products","/dashboard/products"],["Suppliers","/dashboard/suppliers"],["Materials","/dashboard/materials"],["ESG","/dashboard/esg"],["Certificates","/dashboard/certificates"]];
export function DashboardShell({children}:{children:React.ReactNode}){
  const pathname=usePathname(); const router=useRouter();
  async function signOut(){await createSupabaseClient().auth.signOut(); router.push("/login")}
  return <div className="min-h-screen bg-slate-950 text-white"><aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950 p-6 lg:block"><Link href="/dashboard" className="flex items-center gap-3 font-bold"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500 text-slate-950">G</span><span>GreenLean DPP</span></Link><nav className="mt-10 space-y-2">{nav.map(([label,href])=><Link key={href} href={href} className={clsx("block rounded-2xl px-4 py-3 text-sm transition",pathname===href?"bg-white text-slate-950":"text-slate-300 hover:bg-white/10 hover:text-white")}>{label}</Link>)}</nav><button onClick={signOut} className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/10">Sign out</button></aside><main className="lg:pl-72"><div className="min-h-screen bg-slate-50 p-6 text-slate-950 lg:p-10">{children}</div></main></div>
}
