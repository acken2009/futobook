import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  const { data: reservations } = await supabase
    .from("reservations")
    .select(`
      *,
      customers(name, email, phone),
      service_items(name, price)
    `)
    .eq("store_id", store.id)
    .order("reserved_at", { ascending: true });

  const statusLabel: Record<string, string> = {
    pending: "保留",
    confirmed: "確定",
    cancelled: "キャンセル",
    completed: "完了",
    no_show: "無断キャンセル",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
    completed: "bg-blue-100 text-blue-700",
    no_show: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">予約管理</h1>
        <p className="text-gray-500 mt-1">全 {reservations?.length ?? 0} 件</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["日時", "お客様", "サービス", "人数", "ステータス"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reservations && reservations.length > 0 ? (
              reservations.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {new Date(r.reserved_at).toLocaleString("ja-JP", {
                      month: "short",
                      day: "numeric",
                      weekday: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{r.customers?.name}</p>
                    <p className="text-xs text-gray-500">{r.customers?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {r.service_items?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">{r.party_size}名</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        statusColor[r.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusLabel[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  予約がまだありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
