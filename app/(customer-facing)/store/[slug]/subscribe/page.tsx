import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { SubscribeForm } from "./subscribe-form";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ plan?: string; lang?: string }>;
}

export default async function SubscribePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { plan: planId, lang } = await searchParams;
  const isEn = lang === "en";

  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select(`
      id, name, slug,
      stripe_account_status,
      store_customizations(primary_color, secondary_color),
      store_subscription_plans(*)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  const custom = (store.store_customizations as any);
  const plans = ((store.store_subscription_plans as any[]) ?? []).filter((p) => p.is_active);
  const primaryColor = custom?.primary_color ?? "#3B82F6";
  const secondaryColor = custom?.secondary_color ?? "#1E40AF";
  const selectedPlan = planId ? plans.find((p: any) => p.id === planId) : plans[0];
  const canPay = store.stripe_account_status === "active";

  const t = {
    noPlans: isEn ? "No subscription plans available" : "サブスクリプションプランはありません",
    backToStore: isEn ? `← Back to ${store.name}` : `← ${store.name} に戻る`,
    title: isEn ? "Subscribe" : "サブスクリプション加入",
    selectPlan: isEn ? "① Select Plan" : "① プランを選択",
    perMonth: isEn ? "/mo" : "/月",
    perYear: isEn ? "/yr" : "/年",
  };

  if (plans.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">{t.noPlans}</p>
          <Link href={`/store/${slug}${isEn ? "?lang=en" : ""}`} className="text-blue-600 hover:underline mt-2 block">
            {t.backToStore}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="py-8 px-4 text-white"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
      >
        <div className="max-w-lg mx-auto">
          <a href={`/store/${slug}${isEn ? "?lang=en" : ""}`} className="text-white/80 hover:text-white text-sm">
            {t.backToStore}
          </a>
          <h1 className="text-2xl font-bold mt-2">{t.title}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* プラン選択 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">{t.selectPlan}</h2>
          <div className="space-y-3">
            {plans.map((plan: any) => {
              const planName = (isEn && plan.name_en) ? plan.name_en : plan.name;
              const planDesc = (isEn && plan.description_en) ? plan.description_en : plan.description;
              return (
                <Link
                  key={plan.id}
                  href={`/store/${slug}/subscribe?plan=${plan.id}${isEn ? "&lang=en" : ""}`}
                  className={`block p-4 rounded-lg border-2 transition-colors ${
                    selectedPlan?.id === plan.id
                      ? ""
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={selectedPlan?.id === plan.id ? { borderColor: primaryColor } : {}}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{planName}</p>
                      {planDesc && (
                        <p className="text-sm text-gray-500 mt-1">{planDesc}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold" style={{ color: primaryColor }}>
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {plan.interval === "month" ? t.perMonth : t.perYear}
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
              );
            })}
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
            lang={isEn ? "en" : "ja"}
          />
        )}
      </div>
    </div>
  );
}
