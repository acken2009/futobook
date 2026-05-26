import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { SubscribeForm } from "./subscribe-form";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ plan?: string }>;
}

export default async function SubscribePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { plan: planId } = await searchParams;

  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select(`
      id, name, slug,
      stripe_account_status,
      store_customizations(primary_color),
      store_subscription_plans(id, name, description, price, interval, features, is_active)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  const custom = (store.store_customizations as any);
  const plans = ((store.store_subscription_plans as any[]) ?? []).filter((p) => p.is_active);
  const primaryColor = custom?.primary_color ?? "#3B82F6";
  const selectedPlan = planId ? plans.find((p: any) => p.id === planId) : plans[0];
  const canPay = store.stripe_account_status === "active";

  if (plans.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">サブスクリプションプランはありません</p>
          <Link href={`/store/${slug}`} className="text-blue-600 hover:underline mt-2 block">
            ← 店舗ページに戻る
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold mt-2">サブスクリプション加入</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* プラン選択 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">① プランを選択</h2>
          <div className="space-y-3">
            {plans.map((plan: any) => (
              <Link
                key={plan.id}
                href={`/store/${slug}/subscribe?plan=${plan.id}`}
                className={`block p-4 rounded-lg border-2 transition-colors ${
                  selectedPlan?.id === plan.id
                    ? ""
                    : "border-gray-200 hover:border-gray-300"
                }`}
                style={selectedPlan?.id === plan.id ? { borderColor: primaryColor } : {}}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    {plan.description && (
                      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold" style={{ color: primaryColor }}>
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      /{plan.interval === "month" ? "月" : "年"}
                    </span>
                  </div>
                </div>
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {plan.features.map((f: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <span style={{ color: primaryColor }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* お客様情報・決済 */}
        {selectedPlan && (
          <SubscribeForm
            storeId={store.id}
            slug={slug}
            plan={selectedPlan}
            primaryColor={primaryColor}
            canPay={canPay}
          />
        )}
      </div>
    </div>
  );
}
