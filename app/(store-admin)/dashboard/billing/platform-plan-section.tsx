"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  price: number;
  stripe_price_id: string;
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

function feePctLabel(pct: number): string {
  // 0.049 → "4.9%"（浮動小数点誤差を丸める）
  return `${parseFloat((pct * 100).toFixed(2))}%`;
}

function getPlanFeatures(plan: Plan): { text: string; included: boolean }[] {
  const reservations = plan.max_reservations_per_month
    ? `予約 月${plan.max_reservations_per_month}件まで`
    : "予約件数 無制限";
  const fee = `決済手数料 ${feePctLabel(plan.transaction_fee_pct)}`;

  if (plan.name === "スターター") {
    return [
      { text: reservations, included: true },
      { text: fee, included: true },
      { text: "予約受付・メール通知", included: true },
      { text: "店舗ページ公開", included: true },
      { text: "LINE通知・物販・売上分析", included: false },
      { text: "ブランドカスタマイズ", included: false },
      { text: "月額会員（サブスク販売）", included: false },
    ];
  }
  if (plan.name === "ベーシック") {
    return [
      { text: reservations, included: true },
      { text: `${fee}（業界最安級）`, included: true },
      { text: "LINE通知", included: true },
      { text: "物販（オンラインショップ）", included: true },
      { text: "売上分析ダッシュボード", included: true },
      { text: "ブランドカスタマイズ", included: true },
      { text: "月額会員（サブスク販売）", included: false },
    ];
  }
  if (plan.name === "スタンダード") {
    return [
      { text: "ベーシックの全機能", included: true },
      { text: reservations, included: true },
      { text: `${fee}（業界最安水準）`, included: true },
      { text: "月額会員（サブスク販売）", included: true },
      { text: "優先サポート", included: true },
    ];
  }
  return [
    { text: reservations, included: true },
    { text: fee, included: true },
  ];
}

export function PlatformPlanSection({ plans, currentPlanId, storeId: _storeId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<"month" | "year">("month");

  async function handleSelectPlan(planId: string) {
    setLoading(planId);
    setError(null);

    const selectedPlan = plans.find((p) => p.id === planId);
    if (
      selectedPlan &&
      selectedPlan.price > 0 &&
      selectedPlan.stripe_price_id.startsWith("price_placeholder")
    ) {
      setError("このプランはまだ設定中です。管理者にお問い合わせください。");
      setLoading(null);
      return;
    }

    const res = await fetch("/api/stripe/platform-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId, interval }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "エラーが発生しました");
      setLoading(null);
      return;
    }

    if (data.downgraded) {
      // 無料プランへのダウングレード完了 → ページリロードで反映
      window.location.href = "/dashboard/billing?plan=subscribed";
      return;
    }

    // 有料プラン → Stripe Checkoutへリダイレクト
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

      {/* 月払い / 年払い 切り替え */}
      <div className="flex items-center justify-center gap-1 mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              interval === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            月払い
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              interval === "year" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            }`}
          >
            年払い
            <span className="ml-1 text-xs text-green-600 font-semibold">2ヶ月分無料</span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.price === 0 ? !!isOnStarter : currentPlanId === plan.id;
          const badge = getPlanBadge(plan);
          const features = getPlanFeatures(plan);
          const isFree = plan.price === 0;
          const displayPrice =
            interval === "year" && !isFree ? plan.price * 10 : plan.price;

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
                  {isFree ? "¥0" : formatCurrency(displayPrice)}
                </span>
                <span className="text-sm text-gray-500 ml-1">
                  {interval === "year" && !isFree ? "/年" : "/月"}
                </span>
                {interval === "year" && !isFree && (
                  <p className="text-xs text-green-600 mt-0.5">
                    月あたり{formatCurrency(Math.round((plan.price * 10) / 12))}
                  </p>
                )}
              </div>

              <ul className="text-sm space-y-1.5 mb-6 flex-1">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    {f.included ? (
                      <span className="text-blue-500 mt-0.5">✓</span>
                    ) : (
                      <span className="text-gray-300 mt-0.5">─</span>
                    )}
                    <span className={f.included ? "text-gray-600" : "text-gray-400"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="text-center text-sm py-2 rounded-lg font-medium bg-blue-600 text-white">
                  現在のプラン
                </div>
              ) : isFree ? (
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading === plan.id}
                  className="w-full py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {loading === plan.id ? "処理中..." : "ダウングレード"}
                </button>
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
        <br />
        別途Stripe決済手数料（3.6%）が決済ごとにかかります。
      </p>
    </div>
  );
}
