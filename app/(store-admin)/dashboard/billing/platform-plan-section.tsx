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

// プランごとのアピールポイント
function getPlanBadge(plan: Plan): string | null {
  if (plan.name === "ベーシック") return "人気";
  if (plan.name === "スタンダード") return "おすすめ";
  return null;
}

function getPlanFeatures(plan: Plan): string[] {
  const features: string[] = [];
  if (plan.max_reservations_per_month) {
    features.push(`月${plan.max_reservations_per_month}件まで予約`);
  } else {
    features.push("予約件数 無制限");
  }
  features.push(`取引手数料 ${(plan.transaction_fee_pct * 100).toFixed(0)}%`);

  if (plan.name === "スターター") {
    features.push("店舗ページ公開");
    features.push("基本カスタマイズ");
  } else if (plan.name === "ベーシック") {
    features.push("全機能利用可能");
    features.push("ギャラリー写真");
    features.push("サブスクプラン販売");
  } else if (plan.name === "スタンダード") {
    features.push("全機能利用可能");
    features.push("優先サポート");
    features.push("複数スタッフ対応（予定）");
  } else {
    features.push("全機能利用可能");
  }
  return features;
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

  // スターター（¥0）プランのIDを特定
  const starterPlan = plans.find((p) => p.price === 0);
  const isOnStarter = !currentPlanId || (starterPlan && currentPlanId === starterPlan.id);

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.price === 0 ? !!isOnStarter : currentPlanId === plan.id;
          const badge = getPlanBadge(plan);
          const features = getPlanFeatures(plan);
          const isFree = plan.price === 0;

          return (
            <div
              key={plan.id}
              className={`relative border rounded-xl p-5 flex flex-col ${
                isCurrent
                  ? "border-blue-500 bg-blue-50"
                  : plan.name === "スタンダード"
                  ? "border-gray-300"
                  : "border-gray-200"
              }`}
            >
              {badge && (
                <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}

              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-2xl font-bold">
                  {isFree ? "¥0" : formatCurrency(plan.price)}
                </span>
                <span className="text-sm text-gray-500 ml-1">/月</span>
              </div>

              <ul className="text-sm text-gray-600 space-y-1.5 mb-6 flex-1">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="text-center text-sm py-2 rounded-lg font-medium bg-blue-600 text-white">
                  現在のプラン
                </div>
              ) : isFree ? (
                <div className="text-center text-sm py-2 rounded-lg font-medium border border-gray-300 text-gray-500">
                  ダウングレード
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
