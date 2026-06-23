import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function ShopSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { slug } = await params;
  const { order_id } = await searchParams;

  // slug から store_id を取得し、自店舗の注文のみ参照可能にする（IDOR対策）
  const { data: storeRow } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .single();

  let order: any = null;
  if (order_id && storeRow) {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("*, order_items(product_name, quantity, unit_price)")
      .eq("id", order_id)
      .eq("store_id", storeRow.id)
      .eq("status", "paid")
      .single();
    order = data;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">ご注文ありがとうございます！</h1>
        <p className="text-gray-500 text-sm mb-6">
          確認メールをお送りしました。ご確認ください。
        </p>

        {order && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-medium text-gray-500 mb-2">注文内容</p>
            {(order.order_items as any[]).map((item: any) => (
              <div key={item.product_name} className="flex justify-between text-sm text-gray-700 py-1">
                <span>{item.product_name} × {item.quantity}</span>
                <span>¥{(item.unit_price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm font-semibold">
              <span>合計</span>
              <span>¥{order.total_amount.toLocaleString()}</span>
            </div>
          </div>
        )}

        <Link
          href={`/store/${slug}/shop`}
          className="block text-center bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 text-sm"
        >
          ショップに戻る
        </Link>
        <Link
          href={`/store/${slug}`}
          className="block text-center text-gray-500 hover:underline text-sm mt-3"
        >
          店舗トップへ
        </Link>
      </div>
    </main>
  );
}
