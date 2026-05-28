"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  storeId: string;
  slug: string;
  plan: { id: string; name: string; name_en?: string | null; price: number; interval: string };
  primaryColor: string;
  canPay: boolean;
  lang?: "ja" | "en";
}

export function SubscribeForm({ storeId, slug: _slug, plan, primaryColor, canPay, lang = "ja" }: Props) {
  const isEn = lang === "en";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: isEn ? "② Your Details & Payment" : "② お客様情報・お支払い",
    paymentPending: isEn
      ? "⚠️ Payment is not available yet. Please try again later."
      : "⚠️ この店舗は現在決済設定中です。しばらくしてから再度お試しください。",
    name: isEn ? "Full Name" : "お名前",
    email: isEn ? "Email" : "メールアドレス",
    namePlaceholder: isEn ? "John Smith" : "田中 太郎",
    emailPlaceholder: isEn ? "john@example.com" : "tanaka@example.com",
    summary: isEn ? "Summary" : "加入内容",
    perMonth: isEn ? "/ mo (auto-renews)" : "/ 月（自動更新）",
    perYear: isEn ? "/ yr (auto-renews)" : "/ 年（自動更新）",
    submit: isEn ? "Subscribe with Credit Card" : "クレジットカードで加入する",
    processing: isEn ? "Processing..." : "処理中...",
    secure: isEn ? "🔒 Secured by Stripe. Cancel anytime." : "🔒 Stripe による安全な決済。いつでもキャンセルできます。",
    errorDefault: isEn ? "An error occurred. Please try again." : "エラーが発生しました",
  };

  const planName = (isEn && plan.name_en) ? plan.name_en : plan.name;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "subscription",
        store_id: storeId,
        plan_id: plan.id,
        customer: { name, email },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t.errorDefault);
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h2 className="font-semibold mb-4">{t.title}</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {!canPay && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-700">{t.paymentPending}</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.name} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t.namePlaceholder}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.email} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t.emailPlaceholder}
          />
        </div>
      </div>

      {/* 内容確認 */}
      <div
        className="rounded-lg p-4 mb-5 text-sm"
        style={{ backgroundColor: `${primaryColor}10` }}
      >
        <p className="font-medium mb-1">{t.summary}</p>
        <p className="text-gray-700">{planName}</p>
        <p className="text-xl font-bold mt-1" style={{ color: primaryColor }}>
          {formatCurrency(plan.price)}
          <span className="text-sm font-normal text-gray-500 ml-1">
            {plan.interval === "month" ? t.perMonth : t.perYear}
          </span>
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !canPay}
        className="w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? t.processing : t.submit}
      </button>
      <p className="text-xs text-gray-400 text-center mt-2">
        {t.secure}
      </p>
    </form>
  );
}
