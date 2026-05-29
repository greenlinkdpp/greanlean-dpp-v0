import Link from "next/link";
export function PublicHeader(){
  return <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <Link href="/" className="flex items-center gap-3 font-bold"><span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-600 text-white">G</span><span>GreenLean</span></Link>
      <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex"><a href="/#solutions">Solutions</a><a href="/#dpp">DPP</a><a href="/#contact">Contact</a></nav>
      <Link href="/login" className="btn-secondary py-2">DPP Login</Link>
    </div>
  </header>
}
