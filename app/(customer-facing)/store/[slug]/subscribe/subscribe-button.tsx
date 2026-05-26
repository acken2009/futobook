"use client";

import { useState } from "react";

interface Props {
  storeId: string;
  planId: string;
  customerName: string;
  customerEmail: string;
  primaryColor: string;
  disabled?: boolean;
}

export function SubscribeButton({
  storeId,
  planId,
  customerName,
  customerEmail,
  primaryColor,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    if (!customerName || !customerEmail) {
      setError("お名前とメールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "subscription",
        store_id: storeId,
        plan_id: planId,
        customer: { name: customerName, email: customerEmail },
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
    <div>
      {error && (
        <p className="text-red-600 text-sm mb-2">{error}</p>
      )}
      <button
        onClick={handleSubscribe}
        disabled={loading || disabled}
        className="w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? "処理中..." : "クレジットカードで加入する"}
      </button>
      <p className="text-xs text-gray-400 text-center mt-2">
        🔒 Stripe による安全な決済
      </p>
    </div>
  );
}
