import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("name, store_customizations(description)")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) return { title: "Store Not Found" };

  return {
    title: store.name,
    description: (store.store_customizations as any)?.description ?? "",
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select(`
      *,
      store_customizations(*),
      service_items(id, name, description, price, duration_minutes),
      store_subscription_plans(id, name, description, price, interval, features, is_active)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  const custom = (store.store_customizations as any);
  const services = ((store.service_items as any[]) ?? []).filter((s: any) => s.is_active !== false);
  const plans = ((store.store_subscription_plans as any[]) ?? []).filter(
    (p) => p.is_active
  );
  const primaryColor = custom?.primary_color ?? "#3B82F6";
  const secondaryColor = custom?.secondary_color ?? "#1E40AF";

  return (
    <div className="min-h-screen bg-white">
      {/* ヒーローヘッダー */}
      <header
        className="py-16 px-4 text-white text-center"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
      >
        <h1 className="text-4xl font-bold mb-3">{store.name}</h1>
        {custom?.description && (
          <p className="text-lg opacity-90 max-w-xl mx-auto">{custom.description}</p>
        )}
        <div className="mt-6 flex gap-4 justify-center">
          <Link
            href={`/store/${slug}/reserve`}
            className="bg-white text-gray-900 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            予約する
          </Link>
          {plans.length > 0 && (
            <Link
              href={`/store/${slug}/subscribe`}
              className="border border-white text-white px-6 py-2 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              サブスク加入
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 店舗情報 */}
        {(custom?.address || custom?.phone) && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">店舗情報</h2>
            <div className="bg-gray-50 rounded-xl p-6 grid sm:grid-cols-2 gap-4">
              {custom?.address && (
                <div>
                  <p className="text-sm text-gray-500">住所</p>
                  <p className="font-medium">{custom.address}</p>
                </div>
              )}
              {custom?.phone && (
                <div>
                  <p className="text-sm text-gray-500">電話番号</p>
                  <a href={`tel:${custom.phone}`} className="font-medium hover:underline">
                    {custom.phone}
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* サービスメニュー */}
        {services.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">サービスメニュー</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {services.map((s: any) => (
                <div
                  key={s.id}
                  className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                      {s.price ? formatCurrency(s.price) : "無料"}
                    </span>
                  </div>
                  {s.description && (
                    <p className="text-sm text-gray-600 mb-2">{s.description}</p>
                  )}
                  {s.duration_minutes && (
                    <p className="text-xs text-gray-400">{s.duration_minutes}分</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href={`/store/${slug}/reserve`}
                className="inline-block px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                予約する
              </Link>
            </div>
          </section>
        )}

        {/* サブスクプラン */}
        {plans.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">サブスクリプションプラン</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan: any) => (
                <div
                  key={plan.id}
                  className="border border-gray-200 rounded-xl p-6 flex flex-col"
                >
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                  )}
                  <div className="mb-4">
                    <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      /{plan.interval === "month" ? "月" : "年"}
                    </span>
                  </div>
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <ul className="space-y-1 mb-6 flex-1">
                      {plan.features.map((f: string, i: number) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span style={{ color: primaryColor }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={`/store/${slug}/subscribe?plan=${plan.id}`}
                    className="block text-center py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor }}
                  >
                    加入する
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SNSリンク */}
        {(custom?.instagram_url || custom?.twitter_url || custom?.website_url) && (
          <section className="text-center">
            <div className="flex gap-4 justify-center">
              {custom?.website_url && (
                <a
                  href={custom.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  🌐 ウェブサイト
                </a>
              )}
              {custom?.instagram_url && (
                <a
                  href={custom.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  📸 Instagram
                </a>
              )}
              {custom?.twitter_url && (
                <a
                  href={custom.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  𝕏 Twitter
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
