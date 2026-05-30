"use client";

import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";

export function LeadForm() {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          name: "姓名 / 称呼",
          namePlaceholder: "例如：David",
          company: "公司名称",
          companyPlaceholder: "例如：GreenLean",
          contact: "联系方式",
          contactPlaceholder: "手机号 / 邮箱 / WhatsApp / 微信",
          industry: "行业",
          apparel: "纺织服装",
          electronics: "电子电器",
          battery: "电池",
          furniture: "家具家居",
          metal: "五金金属",
          other: "其他",
          message: "需求说明",
          messagePlaceholder: "说说你的产品、出口市场、已有数据情况。",
          submit: "提交免费咨询",
          submitting: "提交中...",
          required: "请填写姓名和联系方式。",
          success: "提交成功，我们会尽快联系你。",
          failed: "提交失败：",
        }
      : {
          name: "Name",
          namePlaceholder: "e.g. David",
          company: "Company",
          companyPlaceholder: "e.g. GreenLean",
          contact: "Contact",
          contactPlaceholder: "Phone / Email / WhatsApp / WeChat",
          industry: "Industry",
          apparel: "Textile & Apparel",
          electronics: "Electronics",
          battery: "Battery",
          furniture: "Furniture & Home",
          metal: "Metal & Hardware",
          other: "Other",
          message: "Message",
          messagePlaceholder:
            "Tell us about your products, export markets and current data readiness.",
          submit: "Submit free consultation",
          submitting: "Submitting...",
          required: "Please enter your name and contact information.",
          success: "Submitted. We will contact you soon.",
          failed: "Submission failed: ",
        };

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMsg(null);

    const form = new FormData(event.currentTarget);

    if (String(form.get("website") || "").trim()) {
      setLoading(false);
      return;
    }

    const payload = {
      name: String(form.get("name") || "").trim(),
      company: String(form.get("company") || "").trim(),
      contact: String(form.get("contact") || "").trim(),
      industry: String(form.get("industry") || "").trim(),
      message: String(form.get("message") || "").trim(),
      source: "greanlean.com",
    };

    if (!payload.name || !payload.contact) {
      setMsg({
        type: "err",
        text: t.required,
      });
      setLoading(false);
      return;
    }

    const { error } = await createSupabaseClient().from("leads").insert(payload);

    if (error) {
      setMsg({
        type: "err",
        text: t.failed + error.message,
      });
    } else {
      event.currentTarget.reset();

      setMsg({
        type: "ok",
        text: t.success,
      });
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="label">{t.name}</label>

        <input
          className="input mt-1"
          name="name"
          required
          placeholder={t.namePlaceholder}
        />
      </div>

      <div>
        <label className="label">{t.company}</label>

        <input
          className="input mt-1"
          name="company"
          placeholder={t.companyPlaceholder}
        />
      </div>

      <div>
        <label className="label">{t.contact}</label>

        <input
          className="input mt-1"
          name="contact"
          required
          placeholder={t.contactPlaceholder}
        />
      </div>

      <div>
        <label className="label">{t.industry}</label>

        <select className="input mt-1" name="industry" defaultValue={t.apparel}>
          <option>{t.apparel}</option>
          <option>{t.electronics}</option>
          <option>{t.battery}</option>
          <option>{t.furniture}</option>
          <option>{t.metal}</option>
          <option>{t.other}</option>
        </select>
      </div>

      <div>
        <label className="label">{t.message}</label>

        <textarea
          className="input mt-1 min-h-28"
          name="message"
          placeholder={t.messagePlaceholder}
        />
      </div>

      <input className="hidden" tabIndex={-1} autoComplete="off" name="website" />

      <button disabled={loading} className="btn-primary w-full" type="submit">
        {loading ? t.submitting : t.submit}
      </button>

      {msg && (
        <p className={msg.type === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
          {msg.text}
        </p>
      )}
    </form>
  );
}