"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  storeId: string;
  slug: string;
  plan: { id: string; name: string; price: number; interval: string };
  primaryColor: string;
  canPay: boolean;
}

export function SubscribeForm({ storeId, slug, plan, primaryColor, canPay }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(data.error ?? "エラーが発生しました");
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
      <h2 className="font-semibold mb-4">② お客様情報・お支払い</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {!canPay && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-700">
            ⚠️ この店舗は現在決済設定中です。しばらくしてから再度お試しください。
          </p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="田中 太郎"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="tanaka@example.com"
          />
        </div>
      </div>

      {/* 内容確認 */}
      <div
        className="rounded-lg p-4 mb-5 text-sm"
        style={{ backgroundColor: `${primaryColor}10` }}
      >
        <p className="font-medium mb-1">加入内容</p>
        <p className="text-gray-700">{plan.name}</p>
        <p className="text-xl font-bold mt-1" style={{ color: primaryColor }}>
          {formatCurrency(plan.price)}
          <span className="text-sm font-normal text-gray-500 ml-1">
            / {plan.interval === "month" ? "月" : "年"}（自動更新）
          </span>
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !canPay}
        className="w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? "処理中..." : "クレジットカードで加入する"}
      </button>
      <p className="text-xs text-gray-400 text-center mt-2">
        🔒 Stripe による安全な決済。いつでもキャンセルできます。
      </p>
    </form>
  );
}
