import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { LeadForm } from "@/components/LeadForm";
export default function Home(){
  return <><PublicHeader/><main>
    <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
      <div><p className="mb-5 inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">Digital Product Passport Platform</p>
      <h1 className="text-5xl font-black tracking-tight text-slate-950 lg:text-7xl">Build compliant, transparent DPPs for global products.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">GreenLean helps brands manage product identity, suppliers, materials, ESG data, certificates and consumer-facing product passports.</p>
      <div className="mt-8 flex flex-wrap gap-4"><a href="#contact" className="btn-primary">Get free assessment</a><Link href="/p/demo-organic-cotton-tshirt" className="btn-secondary">View demo DPP</Link></div></div>
      <div className="card bg-slate-950 text-white"><p className="text-sm text-brand-50">DPP Snapshot</p><h2 className="mt-3 text-3xl font-bold">Organic Cotton T-Shirt</h2><div className="mt-8 grid gap-3">{["Digital Identity","BOM & Materials","Supplier Traceability","ESG Metrics","Certificates","QR/NFC Public Passport"].map(i=><div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">{i}</div>)}</div></div>
    </section>
    <section id="solutions" className="mx-auto max-w-7xl px-6 py-16"><div className="grid gap-6 md:grid-cols-3">{[["Product Data Hub","Manage SKU, brand, identity and product passport data."],["Supply Chain Transparency","Connect suppliers, materials, origins and certifications."],["Public DPP Pages","Generate consumer-facing QR pages for compliance and storytelling."]].map(([t,d])=><div className="card" key={t}><h3 className="text-xl font-bold">{t}</h3><p className="mt-3 text-slate-600">{d}</p></div>)}</div></section>
    <section id="dpp" className="bg-white py-20"><div className="mx-auto max-w-7xl px-6"><h2 className="text-4xl font-black">What your DPP includes</h2><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{["GTIN / SKU / Batch","Materials & recycled content","Carbon, water and energy data","Certificates and verification"].map(i=><div key={i} className="rounded-3xl border border-slate-200 p-6 font-semibold">{i}</div>)}</div></div></section>
    <section id="contact" className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2"><div><h2 className="text-4xl font-black">Start your DPP readiness assessment.</h2><p className="mt-4 text-slate-600">Tell us about your product category and target market. We will help you map the next step.</p></div><LeadForm/></section>
  </main></>
}
