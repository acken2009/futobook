import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
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

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const isEn = lang === "en";

  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select(`
      *,
      store_customizations(*),
      service_items(*),
      store_subscription_plans(*)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  // Fetch gallery images (graceful: table may not exist yet before migration)
  let galleryImages: { id: string; url: string; alt_text: string | null }[] = [];
  try {
    const { data } = await supabaseAdmin
      .from("store_images")
      .select("id, url, alt_text")
      .eq("store_id", store.id)
      .order("sort_order")
      .order("created_at");
    if (data) galleryImages = data;
  } catch {
    // table not yet created — skip gallery
  }

  const custom = (store.store_customizations as any);
  const services = ((store.service_items as any[]) ?? []).filter((s: any) => s.is_active !== false);
  const plans = ((store.store_subscription_plans as any[]) ?? []).filter(
    (p) => p.is_active
  );
  const primaryColor = custom?.primary_color ?? "#3B82F6";
  const secondaryColor = custom?.secondary_color ?? "#1E40AF";
  const logoUrl = custom?.logo_url as string | null;
  const coverUrl = custom?.cover_image_url as string | null;
  const images = galleryImages;

  // i18n helpers
  const t = {
    reserve: isEn ? "Book Now" : "予約する",
    subscribe: isEn ? "Subscribe" : "サブスク加入",
    storeInfo: isEn ? "Store Info" : "店舗情報",
    address: isEn ? "Address" : "住所",
    phone: isEn ? "Phone" : "電話番号",
    services: isEn ? "Services" : "サービスメニュー",
    plans: isEn ? "Subscription Plans" : "サブスクリプションプラン",
    gallery: isEn ? "Gallery" : "ギャラリー",
    website: isEn ? "Website" : "ウェブサイト",
    free: isEn ? "Free" : "無料",
    min: isEn ? "min" : "分",
    perMonth: isEn ? "/mo" : "/月",
    perYear: isEn ? "/yr" : "/年",
    join: isEn ? "Join" : "加入する",
    description: isEn
      ? (custom?.description_en || custom?.description || "")
      : (custom?.description || ""),
  };

  const otherLang = isEn ? "ja" : "en";
  const otherLangLabel = isEn ? "日本語" : "English";
  const toggleHref = `/store/${slug}${otherLang === "en" ? "?lang=en" : ""}`;

  function serviceName(s: any) {
    return (isEn && s.name_en) ? s.name_en : s.name;
  }
  function serviceDesc(s: any) {
    return (isEn && s.description_en) ? s.description_en : s.description;
  }
  function planName(p: any) {
    return (isEn && p.name_en) ? p.name_en : p.name;
  }
  function planDesc(p: any) {
    return (isEn && p.description_en) ? p.description_en : p.description;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ヒーローヘッダー */}
      <header
        className="relative py-16 px-4 text-white text-center overflow-hidden"
        style={coverUrl ? {} : { background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
      >
        {/* カバー画像背景 */}
        {coverUrl && (
          <>
            <Image
              src={coverUrl}
              alt="cover"
              fill
              className="object-cover"
              unoptimized
              priority
            />
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}cc 0%, ${secondaryColor}cc 100%)` }}
            />
          </>
        )}

        {/* 言語切り替えボタン */}
        <div className="absolute top-4 right-4 z-10">
          <Link
            href={toggleHref}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm px-3 py-1.5 rounded-full transition-colors border border-white/30"
          >
            🌐 {otherLangLabel}
          </Link>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3">
          {/* ロゴ */}
          {logoUrl && (
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg bg-white/10">
              <Image src={logoUrl} alt="logo" width={80} height={80} className="object-cover w-full h-full" unoptimized />
            </div>
          )}
          <h1 className="text-4xl font-bold">{store.name}</h1>
          {t.description && (
            <p className="text-lg opacity-90 max-w-xl mx-auto">{t.description}</p>
          )}
          <div className="mt-2 flex gap-4 justify-center">
            <Link
              href={`/store/${slug}/reserve${isEn ? "?lang=en" : ""}`}
              className="bg-white text-gray-900 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              {t.reserve}
            </Link>
            {plans.length > 0 && (
              <Link
                href={`/store/${slug}/subscribe${isEn ? "?lang=en" : ""}`}
                className="border border-white text-white px-6 py-2 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                {t.subscribe}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* 店舗情報 */}
        {(custom?.address || custom?.phone) && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">{t.storeInfo}</h2>
            <div className="bg-gray-50 rounded-xl p-6 grid sm:grid-cols-2 gap-4">
              {custom?.address && (
                <div>
                  <p className="text-sm text-gray-500">{t.address}</p>
                  <p className="font-medium">{custom.address}</p>
                </div>
              )}
              {custom?.phone && (
                <div>
                  <p className="text-sm text-gray-500">{t.phone}</p>
                  <a href={`tel:${custom.phone}`} className="font-medium hover:underline">
                    {custom.phone}
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ギャラリー */}
        {images.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">{t.gallery}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="aspect-square rounded-xl overflow-hidden bg-gray-100"
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text ?? ""}
                    width={400}
                    height={400}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* サービスメニュー */}
        {services.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">{t.services}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {services.map((s: any) => (
                <div
                  key={s.id}
                  className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{serviceName(s)}</h3>
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                      {s.price ? formatCurrency(s.price) : t.free}
                    </span>
                  </div>
                  {serviceDesc(s) && (
                    <p className="text-sm text-gray-600 mb-2">{serviceDesc(s)}</p>
                  )}
                  {s.duration_minutes && (
                    <p className="text-xs text-gray-400">{s.duration_minutes}{t.min}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href={`/store/${slug}/reserve${isEn ? "?lang=en" : ""}`}
                className="inline-block px-8 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                {t.reserve}
              </Link>
            </div>
          </section>
        )}

        {/* サブスクプラン */}
        {plans.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">{t.plans}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan: any) => (
                <div
                  key={plan.id}
                  className="border border-gray-200 rounded-xl p-6 flex flex-col"
                >
                  <h3 className="font-bold text-lg mb-1">{planName(plan)}</h3>
                  {planDesc(plan) && (
                    <p className="text-sm text-gray-600 mb-3">{planDesc(plan)}</p>
                  )}
                  <div className="mb-4">
                    <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {plan.interval === "month" ? t.perMonth : t.perYear}
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
                    href={`/store/${slug}/subscribe?plan=${plan.id}${isEn ? "&lang=en" : ""}`}
                    className="block text-center py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {t.join}
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
                  🌐 {t.website}
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
