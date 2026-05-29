"use client";
import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
export function LeadForm(){
  const [loading,setLoading]=useState(false); const [msg,setMsg]=useState<{type:"ok"|"err";text:string}|null>(null);
  async function handleSubmit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); setLoading(true); setMsg(null);
    const form=new FormData(event.currentTarget);
    if(String(form.get("website")||"").trim()){setLoading(false);return;}
    const payload={name:String(form.get("name")||"").trim(),company:String(form.get("company")||"").trim(),contact:String(form.get("contact")||"").trim(),industry:String(form.get("industry")||"").trim(),message:String(form.get("message")||"").trim(),source:"greanlean.com"};
    if(!payload.name||!payload.contact){setMsg({type:"err",text:"请填写姓名和联系方式。"});setLoading(false);return;}
    const {error}=await createSupabaseClient().from("leads").insert(payload);
    if(error)setMsg({type:"err",text:"提交失败："+error.message}); else {event.currentTarget.reset();setMsg({type:"ok",text:"提交成功，我们会尽快联系你。"});}
    setLoading(false);
  }
  return <form onSubmit={handleSubmit} className="card space-y-4">
    <div><label className="label">姓名 / 称呼</label><input className="input mt-1" name="name" required placeholder="例如：David"/></div>
    <div><label className="label">公司名称</label><input className="input mt-1" name="company" placeholder="例如：GreenLean"/></div>
    <div><label className="label">联系方式</label><input className="input mt-1" name="contact" required placeholder="手机号 / 邮箱 / WhatsApp / 微信"/></div>
    <div><label className="label">行业</label><select className="input mt-1" name="industry" defaultValue="纺织服装"><option>纺织服装</option><option>电子电器</option><option>电池</option><option>家具家居</option><option>五金金属</option><option>其他</option></select></div>
    <div><label className="label">需求说明</label><textarea className="input mt-1 min-h-28" name="message" placeholder="说说你的产品、出口市场、已有数据情况。"/></div>
    <input className="hidden" tabIndex={-1} autoComplete="off" name="website"/>
    <button disabled={loading} className="btn-primary w-full" type="submit">{loading?"提交中...":"提交免费咨询"}</button>
    {msg&&<p className={msg.type==="ok"?"text-sm text-green-700":"text-sm text-red-600"}>{msg.text}</p>}
  </form>
}
