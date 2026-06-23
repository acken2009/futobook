import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(product_name, quantity, unit_price)")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const statusLabel = (s: string) => {
    if (s === "paid") return { text: "支払済", cls: "bg-green-100 text-green-700" };
    if (s === "pending") return { text: "未払い", cls: "bg-yellow-100 text-yellow-700" };
    return { text: "キャンセル", cls: "bg-gray-100 text-gray-500" };
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">注文管理</h1>
        <p className="text-sm text-gray-500 mt-1">物販の注文履歴</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>注文がまだありません</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">注文日時</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">顧客</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">商品</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">金額</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o: any) => {
                const s = statusLabel(o.status);
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(o.created_at).toLocaleString("ja-JP", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{o.customer_name}</p>
                      <p className="text-xs text-gray-400">{o.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(o.order_items as any[]).map((i: any) => (
                        <span key={i.id ?? i.product_name} className="block">{i.product_name} × {i.quantity}</span>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ¥{o.total_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.cls}`}>
                        {s.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
