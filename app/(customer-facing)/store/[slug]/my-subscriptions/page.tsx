import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CustomerPortalButton } from "./customer-portal-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MySubscriptionsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, store_customizations(primary_color)")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  const custom = (store.store_customizations as any[])?.[0];
  const primaryColor = custom?.primary_color ?? "#3B82F6";

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="py-8 px-4 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-lg mx-auto">
          <a href={`/store/${slug}`} className="text-white/80 hover:text-white text-sm">
            ← {store.name} に戻る
          </a>
          <h1 className="text-2xl font-bold mt-2">サブスクリプション管理</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-3">ご加入中のサブスクリプション</h2>
          <p className="text-gray-600 text-sm mb-6">
            メールアドレスを入力すると、Stripe の安全なポータルへ移動してサブスクリプションの確認・変更・キャンセルができます。
          </p>
          <CustomerPortalButton storeId={store.id} primaryColor={primaryColor} />
        </div>
      </div>
    </div>
  );
}
