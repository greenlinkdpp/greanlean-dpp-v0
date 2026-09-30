"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type LeadFormProps = {
  mode?: "consultation" | "pilot";
  source?: string;
  initialIndustry?: "apparel" | "electronics" | "battery" | "furniture" | "metal" | "other";
  initialMessage?: string;
};

export function LeadForm({
  mode = "consultation",
  source = "greanlean.com",
  initialIndustry = "apparel",
  initialMessage = "",
}: LeadFormProps = {}) {
  const { locale } = useLanguage();

  const t =
    locale === "zh"
      ? {
          name: "姓名 / 称呼",
          namePlaceholder: "例如：David",
          company: "公司名称",
          companyPlaceholder: "例如：greanlean",
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
          submitPilot: "提交试点申请",
          submitting: "提交中...",
          required: "请填写姓名和联系方式。",
          success: "提交成功，我们会尽快联系你。",
          pilotSuccess: "试点申请已提交，我们会联系你确认产品范围和下一步资料。",
          failed: "提交失败：",
          timeout: "提交超时，请稍后重试或直接联系我们。",
        }
      : {
          name: "Name",
          namePlaceholder: "e.g. David",
          company: "Company",
          companyPlaceholder: "e.g. greanlean",
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
          submitPilot: "Submit pilot application",
          submitting: "Submitting...",
          required: "Please enter your name and contact information.",
          success: "Submitted. We will contact you soon.",
          pilotSuccess: "Your pilot application has been submitted. We will contact you to confirm scope and next inputs.",
          failed: "Submission failed: ",
          timeout: "Submission timed out. Please try again or contact us directly.",
        };

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setMsg(null);

    if (String(form.get("website") || "").trim()) {
      return;
    }

    const payload = {
      name: String(form.get("name") || "").trim(),
      company: String(form.get("company") || "").trim(),
      email: String(form.get("contact") || "").trim(),
      interest: String(form.get("industry") || "GENERAL_CONSULTATION").trim(),
      message: String(form.get("message") || "").trim(),
      website: String(form.get("website") || ""), locale, source,
    };

    if (!payload.name || !payload.company || !payload.email || !payload.message) {
      setMsg({
        type: "err",
        text: t.required,
      });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error(t.timeout)), 12000);
      });
      const insertPromise = fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = (await Promise.race([insertPromise, timeoutPromise])) as Response;

      if (!result.ok) {
        setMsg({
          type: "err",
          text: t.failed + t.timeout,
        });
      } else {
        formEl.reset();

        setMsg({
          type: "ok",
          text: mode === "pilot" ? t.pilotSuccess : t.success,
        });
      }
    } catch (error) {
      setMsg({
        type: "err",
        text:
          t.failed +
          (error instanceof Error && error.message ? error.message : t.timeout),
      });
    } finally {
      setLoading(false);
    }
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

        <select className="input mt-1" name="industry" defaultValue="GENERAL_CONSULTATION">
          <option value="BATTERY_PASSPORT">{t.battery}</option>
          <option value="INDUSTRIAL_BATTERY">{locale === "zh" ? "工业电池" : "Industrial Battery"}</option>
          <option value="TEXTILE_DPP">{t.apparel}</option>
          <option value="CONSUMER_ELECTRONICS_DPP">{t.electronics}</option>
          <option value="OTHER_DPP">{t.other}</option>
          <option value="GENERAL_CONSULTATION">{locale === "zh" ? "一般咨询" : "General Consultation"}</option>
        </select>
      </div>

      <div>
        <label className="label">{t.message}</label>

        <textarea
          className="input mt-1 min-h-28"
          name="message"
          defaultValue={initialMessage}
          placeholder={t.messagePlaceholder}
        />
      </div>

      <input className="hidden" tabIndex={-1} autoComplete="off" name="website" />

      <button disabled={loading} className="btn-primary w-full" type="submit">
        {loading ? t.submitting : mode === "pilot" ? t.submitPilot : t.submit}
      </button>

      {msg && (
        <p className={msg.type === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
