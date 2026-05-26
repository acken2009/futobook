import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { RevenueChart } from "./revenue-chart";
import { subDays, startOfDay, format } from "date-fns";


export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  const now = new Date();
  const thirtyDaysAgo = startOfDay(subDays(now, 29));
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // 過去30日の決済データ
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, platform_fee, created_at, type")
    .eq("store_id", store.id)
    .eq("status", "succeeded")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at");

  // 今月・先月の売上比較
  const { data: thisMonthPayments } = await supabase
    .from("payments")
    .select("amount, platform_fee")
    .eq("store_id", store.id)
    .eq("status", "succeeded")
    .gte("created_at", thisMonthStart.toISOString());

  const { data: lastMonthPayments } = await supabase
    .from("payments")
    .select("amount, platform_fee")
    .eq("store_id", store.id)
    .eq("status", "succeeded")
    .gte("created_at", lastMonthStart.toISOString())
    .lte("created_at", lastMonthEnd.toISOString());

  // 予約統計
  const { data: reservationStats } = await supabase
    .from("reservations")
    .select("status, created_at")
    .eq("store_id", store.id)
    .gte("created_at", thirtyDaysAgo.toISOString());

  // MRR
  const { data: activeSubs } = await supabase
    .from("customer_subscriptions")
    .select("store_subscription_plans(price)")
    .eq("store_id", store.id)
    .eq("status", "active");

  const mrr = activeSubs?.reduce(
    (sum, s) => sum + ((s.store_subscription_plans as any)?.price ?? 0),
    0
  ) ?? 0;

  // 日別売上データ（グラフ用）
  const dailyRevenue: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(now, i), "MM/dd");
    dailyRevenue[d] = 0;
  }
  payments?.forEach((p) => {
    const d = format(new Date(p.created_at), "MM/dd");
    if (dailyRevenue[d] !== undefined) {
      dailyRevenue[d] += p.amount - p.platform_fee;
    }
  });

  const chartData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  // 集計
  const thisMonthRevenue =
    thisMonthPayments?.reduce((s, p) => s + p.amount - p.platform_fee, 0) ?? 0;
  const lastMonthRevenue =
    lastMonthPayments?.reduce((s, p) => s + p.amount - p.platform_fee, 0) ?? 0;
  const revenueGrowth =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : null;

  const confirmedReservations =
    reservationStats?.filter((r) => r.status === "confirmed").length ?? 0;
  const cancelledReservations =
    reservationStats?.filter((r) => r.status === "cancelled").length ?? 0;
  const totalReservations = reservationStats?.length ?? 0;
  const cancellationRate =
    totalReservations > 0
      ? Math.round((cancelledReservations / totalReservations) * 100)
      : 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">アナリティクス</h1>
      <p className="text-gray-500 mb-8">過去30日間のパフォーマンス</p>

      {/* KPIカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "今月の売上（手取り）",
            value: formatCurrency(thisMonthRevenue),
            sub: revenueGrowth !== null
              ? `先月比 ${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}%`
              : "先月データなし",
            color: revenueGrowth !== null
              ? revenueGrowth >= 0 ? "text-green-600" : "text-red-500"
              : "text-gray-400",
            icon: "💰",
          },
          {
            label: "月間定期収益 (MRR)",
            value: formatCurrency(mrr),
            sub: `${activeSubs?.length ?? 0}名が加入中`,
            color: "text-blue-600",
            icon: "🔄",
          },
          {
            label: "予約件数（30日）",
            value: `${confirmedReservations}件`,
            sub: `確定率 ${totalReservations > 0
              ? Math.round((confirmedReservations / totalReservations) * 100)
              : 0}%`,
            color: "text-gray-600",
            icon: "📅",
          },
          {
            label: "キャンセル率",
            value: `${cancellationRate}%`,
            sub: `${cancelledReservations}件キャンセル`,
            color: cancellationRate > 20 ? "text-red-500" : "text-gray-600",
            icon: "❌",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-2">{kpi.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-sm text-gray-500 mt-1">{kpi.label}</div>
            <div className={`text-xs mt-1 font-medium ${kpi.color}`}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* 売上推移グラフ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold mb-6">売上推移（過去30日・手取り額）</h2>
        <RevenueChart data={chartData} />
      </div>

      {/* 決済種別内訳 */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">決済種別内訳（30日）</h2>
          {(() => {
            const byType = (payments ?? []).reduce<Record<string, number>>(
              (acc, p) => ({
                ...acc,
                [p.type]: (acc[p.type] ?? 0) + p.amount - p.platform_fee,
              }),
              {}
            );
            const labels: Record<string, string> = {
              reservation: "予約",
              subscription: "サブスク",
              platform_fee: "プラットフォーム手数料",
              refund: "返金",
            };
            const total = Object.values(byType).reduce((s, v) => s + v, 0);
            return Object.entries(byType).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(byType).map(([type, amount]) => (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{labels[type] ?? type}</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${total > 0 ? (amount / total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">データがありません</p>
            );
          })()}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">予約ステータス内訳（30日）</h2>
          {totalReservations > 0 ? (
            <div className="space-y-3">
              {[
                { label: "確定", count: confirmedReservations, color: "bg-green-500" },
                { label: "キャンセル", count: cancelledReservations, color: "bg-red-400" },
                {
                  label: "その他",
                  count: totalReservations - confirmedReservations - cancelledReservations,
                  color: "bg-gray-300",
                },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-medium">{s.count}件</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${s.color} rounded-full`}
                      style={{
                        width: `${(s.count / totalReservations) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">データがありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
