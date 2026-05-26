import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { SubscriptionPlanManager } from "./subscription-plan-manager";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id, stripe_account_status")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  const { data: plans } = await supabase
    .from("store_subscription_plans")
    .select(`
      *,
      customer_subscriptions(count)
    `)
    .eq("store_id", store.id)
    .order("created_at");

  const { data: activeSubs } = await supabase
    .from("customer_subscriptions")
    .select("*, store_subscription_plans(name, price), customers(name, email)")
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const monthlyMrr =
    activeSubs?.reduce((sum, s) => sum + ((s.store_subscription_plans as any)?.price ?? 0), 0) ?? 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">サブスクリプション管理</h1>
      <p className="text-gray-500 mb-8">プランの作成と加入者の管理ができます</p>

      {/* MRRサマリー */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">月間定期収益 (MRR)</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(monthlyMrr)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">アクティブ加入者</p>
          <p className="text-2xl font-bold mt-1">{activeSubs?.length ?? 0}名</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">公開プラン数</p>
          <p className="text-2xl font-bold mt-1">
            {plans?.filter((p) => p.is_active).length ?? 0}件
          </p>
        </div>
      </div>

      {/* プラン管理 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold mb-4">プラン管理</h2>
        <SubscriptionPlanManager
          storeId={store.id}
          plans={plans ?? []}
          canAcceptPayments={store.stripe_account_status === "active"}
        />
      </div>

      {/* アクティブ加入者一覧 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">アクティブ加入者</h2>
        {activeSubs && activeSubs.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["お客様", "プラン", "次回更新日"].map((h) => (
                  <th key={h} className="pb-2 text-left text-sm font-medium text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeSubs.map((sub: any) => (
                <tr key={sub.id}>
                  <td className="py-3">
                    <p className="font-medium text-sm">{sub.customers?.name}</p>
                    <p className="text-xs text-gray-500">{sub.customers?.email}</p>
                  </td>
                  <td className="py-3 text-sm">
                    {sub.store_subscription_plans?.name}
                    <span className="text-gray-400 ml-2">
                      ({formatCurrency(sub.store_subscription_plans?.price ?? 0)}/月)
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString("ja-JP")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">
            アクティブな加入者がいません
          </p>
        )}
      </div>
    </div>
  );
}
