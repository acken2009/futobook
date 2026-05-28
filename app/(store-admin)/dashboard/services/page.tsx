import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ServiceManager } from "./service-manager";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  const { data: items } = await supabaseAdmin
    .from("service_items")
    .select("*")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">サービスメニュー</h1>
      </div>
      <p className="text-gray-500 mb-8">
        予約時に選べるサービスを管理します。料金を設定すると有料予約になります。
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <ServiceManager storeId={store.id} initialItems={items ?? []} />
      </div>

      {/* 使い方ヒント */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 使い方</p>
        <ul className="space-y-1 text-blue-700">
          <li>・料金を設定すると、顧客がそのサービスを選んだ際にStripe決済が発生します</li>
          <li>・料金を空欄または0にすると「無料」として無決済で予約が確定します</li>
          <li>・「非公開」にしたサービスは予約フォームに表示されません</li>
        </ul>
      </div>
    </div>
  );
}
