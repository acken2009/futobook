import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 店舗情報取得
  const { data: store } = await supabase
    .from("stores")
    .select(`
      *,
      store_customizations(*),
      reservation_settings(*)
    `)
    .eq("owner_id", user.id)
    .single();

  // 店舗未作成の場合は作成フローへ
  if (!store) {
    redirect("/dashboard/onboarding");
  }

  // 直近の予約（5件）
  const { data: recentReservations } = await supabase
    .from("reservations")
    .select("*, customers(name, email), service_items(name)")
    .eq("store_id", store.id)
    .order("reserved_at", { ascending: true })
    .gte("reserved_at", new Date().toISOString())
    .limit(5);

  // 今月の売上
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, platform_fee")
    .eq("store_id", store.id)
    .eq("status", "succeeded")
    .gte("created_at", startOfMonth.toISOString());

  const monthlyRevenue =
    payments?.reduce((sum, p) => sum + p.amount - p.platform_fee, 0) ?? 0;

  // 今月の予約数
  const { count: monthlyReservations } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("status", "confirmed")
    .gte("reserved_at", startOfMonth.toISOString());

  // アクティブサブスク数
  const { count: activeSubscriptions } = await supabase
    .from("customer_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("status", "active");

  // セットアップチェック
  const { count: serviceItemCount } = await supabase
    .from("service_items")
    .select("*", { count: "exact", head: true })
    .eq("store_id", store.id);

  const { count: availabilityCount } = await supabase
    .from("availability_schedules")
    .select("*", { count: "exact", head: true })
    .eq("store_id", store.id);

  const setupItems = [
    {
      label: "サービスメニューを登録する",
      done: (serviceItemCount ?? 0) > 0,
      href: "/dashboard/services",
    },
    {
      label: "営業時間・予約枠を設定する",
      done: (availabilityCount ?? 0) > 0,
      href: "/dashboard/availability",
    },
    {
      label: "Stripeで決済を有効にする",
      done: store.stripe_account_status === "active",
      href: "/dashboard/billing",
    },
    {
      label: "店舗ページを確認する",
      done: true,
      href: `/store/${store.slug}`,
      external: true,
    },
  ];
  const setupDone = setupItems.filter((i) => i.done).length;
  const allSetupDone = setupDone === setupItems.length;

  const stats = [
    { label: "今月の売上", value: formatCurrency(monthlyRevenue), icon: "💰" },
    { label: "今月の予約", value: `${monthlyReservations ?? 0}件`, icon: "📅" },
    { label: "アクティブサブスク", value: `${activeSubscriptions ?? 0}件`, icon: "🔄" },
    {
      label: "Stripe連携",
      value: store.stripe_account_status === "active" ? "有効" : "未設定",
      icon: store.stripe_account_status === "active" ? "✅" : "⚠️",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {store.name} のダッシュボード
        </h1>
        <p className="text-gray-500 mt-1">
          /store/{store.slug} で公開されています
        </p>
      </div>

      {/* Stripe未連携の警告 */}
      {store.stripe_account_status !== "active" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="font-medium text-amber-800">Stripe連携が必要です</p>
            <p className="text-sm text-amber-700">
              決済を受け取るにはStripeアカウントを連携してください。
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700"
          >
            連携する
          </Link>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* セットアップチェックリスト（完了済みなら非表示） */}
      {!allSetupDone && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">スタートアップガイド</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {setupDone}/{setupItems.length} ステップ完了
              </p>
            </div>
            <div className="w-24 bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(setupDone / setupItems.length) * 100}%` }}
              />
            </div>
          </div>
          <ul className="space-y-2">
            {setupItems.map((item) => (
              <li key={item.label}>
                {item.done ? (
                  <span className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs flex-shrink-0">✓</span>
                    <span className="line-through">{item.label}</span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    target={(item as any).external ? "_blank" : undefined}
                    className="flex items-center gap-3 text-sm text-blue-600 hover:underline"
                  >
                    <span className="w-5 h-5 rounded-full border-2 border-blue-300 flex items-center justify-center flex-shrink-0" />
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 直近の予約 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">直近の予約</h2>
          <Link
            href="/dashboard/reservations"
            className="text-sm text-blue-600 hover:underline"
          >
            すべて見る →
          </Link>
        </div>

        {recentReservations && recentReservations.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentReservations.map((r: any) => (
              <div key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{r.customers?.name}</p>
                  <p className="text-sm text-gray-500">
                    {r.service_items?.name ?? "未指定"} ·{" "}
                    {new Date(r.reserved_at).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    r.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : r.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {r.status === "confirmed"
                    ? "確定"
                    : r.status === "pending"
                    ? "保留"
                    : r.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-8">
            予約がまだありません
          </p>
        )}
      </div>
    </div>
  );
}
