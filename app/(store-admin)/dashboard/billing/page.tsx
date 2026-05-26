import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConnectOnboarding } from "./connect-onboarding";
import { PlatformPlanSection } from "./platform-plan-section";
import { formatCurrency } from "@/lib/utils";

interface Props {
  searchParams: Promise<{ connect?: string }>;
}

export default async function BillingPage({ searchParams }: Props) {
  const { connect } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select(`
      id, name, slug,
      stripe_account_id, stripe_account_status,
      platform_plan_id,
      store_platform_subscriptions(
        status, current_period_end,
        platform_subscription_plans(name, price)
      )
    `)
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  // プラットフォームプラン一覧
  const { data: plans } = await supabase
    .from("platform_subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price");

  const platformSub = (store.store_platform_subscriptions as any[])?.[0];
  const currentPlan = platformSub?.platform_subscription_plans;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">プラン・請求設定</h1>
      <p className="text-gray-500 mb-8">決済受け取りの設定とプラットフォーム利用プランを管理します。</p>

      {/* Connect 成功/リフレッシュメッセージ */}
      {connect === "success" && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-6">
          ✅ Stripe連携が完了しました！決済を受け取る準備ができています。
        </div>
      )}
      {connect === "refresh" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 mb-6">
          ⚠️ 設定が完了していません。再度「Stripe連携を開始」をクリックして手続きを続けてください。
        </div>
      )}

      {/* Stripe Connect セクション */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Stripe Connect（決済受け取り）</h2>
            <p className="text-sm text-gray-500 mt-1">
              顧客からの予約・サブスク料金を受け取るために必要です
            </p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              store.stripe_account_status === "active"
                ? "bg-green-100 text-green-700"
                : store.stripe_account_status === "pending"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {store.stripe_account_status === "active"
              ? "✅ 連携済み"
              : store.stripe_account_status === "pending"
              ? "⏳ 審査中"
              : "未連携"}
          </span>
        </div>

        <ConnectOnboarding status={store.stripe_account_status} />
      </section>

      {/* プラットフォームプラン */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-1">プラットフォームプラン</h2>
        <p className="text-sm text-gray-500 mb-6">
          現在のプラン: <strong>{currentPlan?.name ?? "未加入（フリー）"}</strong>
          {platformSub?.current_period_end && (
            <span className="text-gray-400 ml-2">
              （次回更新: {new Date(platformSub.current_period_end).toLocaleDateString("ja-JP")}）
            </span>
          )}
        </p>

        <PlatformPlanSection
          plans={plans ?? []}
          currentPlanId={store.platform_plan_id}
          storeId={store.id}
        />
      </section>
    </div>
  );
}
