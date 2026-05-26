"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  max_reservations_per_month: number | null;
  transaction_fee_pct: number;
}

interface Props {
  plans: Plan[];
  currentPlanId: string | null;
  storeId: string;
}

export function PlatformPlanSection({ plans, currentPlanId, storeId: _storeId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectPlan(planId: string) {
    setLoading(planId);
    setError(null);

    const res = await fetch("/api/stripe/platform-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "エラーが発生しました");
      setLoading(null);
      return;
    }

    // Stripe Checkoutへリダイレクト
    window.location.href = data.url;
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {/* フリープラン */}
        <div
          className={`border rounded-xl p-5 ${
            !currentPlanId ? "border-blue-500 bg-blue-50" : "border-gray-200"
          }`}
        >
          <h3 className="font-bold text-lg mb-1">Free</h3>
          <p className="text-2xl font-bold mb-1">¥0</p>
          <p className="text-sm text-gray-500 mb-4">/月</p>
          <ul className="text-sm text-gray-600 space-y-1 mb-6">
            <li>✓ 月100件まで予約</li>
            <li>✓ 手数料 5%</li>
            <li>✓ 基本カスタマイズ</li>
          </ul>
          <div
            className={`text-center text-sm py-2 rounded-lg font-medium ${
              !currentPlanId
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-gray-500"
            }`}
          >
            {!currentPlanId ? "現在のプラン" : "フリーのまま利用"}
          </div>
        </div>

        {/* 有料プラン */}
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`border rounded-xl p-5 ${
                isCurrent ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
            >
              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <p className="text-2xl font-bold mb-1">
                {formatCurrency(plan.price)}
              </p>
              <p className="text-sm text-gray-500 mb-4">/月</p>
              <ul className="text-sm text-gray-600 space-y-1 mb-6">
                <li>
                  ✓{" "}
                  {plan.max_reservations_per_month
                    ? `月${plan.max_reservations_per_month}件まで予約`
                    : "予約件数無制限"}
                </li>
                <li>✓ 手数料 {(plan.transaction_fee_pct * 100).toFixed(0)}%</li>
                <li>✓ 全機能利用可能</li>
              </ul>

              {isCurrent ? (
                <div className="text-center text-sm py-2 rounded-lg font-medium bg-blue-600 text-white">
                  現在のプラン
                </div>
              ) : (
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading === plan.id}
                  className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading === plan.id ? "処理中..." : "このプランにする"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        プランはいつでも変更・キャンセルできます。Stripeの安全な決済で処理されます。
      </p>
    </div>
  );
}
