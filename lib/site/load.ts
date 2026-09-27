/**
 * 店舗サイトの描画データ読み込み（サーバー専用）
 * 公開ページとプレビューで同じデータを使うために共通化している。
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreFeatures } from "@/lib/plans/features";
import { normalizeSiteConfig, type SiteConfig } from "./config";
import { defaultSiteConfig } from "./templates";
import type { SiteData } from "@/components/site/site-renderer";

/** stores + store_customizations(*) + service_items(*) + store_subscription_plans(*) の行 */
export const STORE_SITE_SELECT = `
  *,
  store_customizations(*),
  service_items(*),
  store_subscription_plans(*)
`;

export function customizationOf(store: any): Record<string, any> | null {
  const c = store?.store_customizations;
  return (Array.isArray(c) ? c[0] : c) ?? null;
}

export async function loadStoreSite(store: any, isEn: boolean): Promise<{ config: SiteConfig; data: SiteData }> {
  const custom = customizationOf(store);

  // ギャラリー・営業時間（テーブル未作成でもページは表示する）
  const [imagesRes, hoursRes, features] = await Promise.all([
    supabaseAdmin
      .from("store_images")
      .select("id, url, alt_text")
      .eq("store_id", store.id)
      .order("sort_order")
      .order("created_at")
      .then((r) => r, () => ({ data: null })),
    supabaseAdmin
      .from("availability_schedules")
      .select("day_of_week, open_time, close_time, is_closed")
      .eq("store_id", store.id)
      .then((r) => r, () => ({ data: null })),
    getStoreFeatures(store.id),
  ]);

  const pick = (ja: string | null | undefined, en: string | null | undefined) => (isEn && en ? en : ja ?? null);

  const services = ((store.service_items as any[]) ?? [])
    .filter((s) => s.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s) => ({
      id: s.id,
      name: pick(s.name, s.name_en) ?? "",
      description: pick(s.description, s.description_en),
      price: s.price ?? null,
      duration_minutes: s.duration_minutes ?? null,
    }));

  // 月額会員はスタンダードプランのみ公開（プラン機能フェンス）
  const plans = features.customerSubscriptions
    ? ((store.store_subscription_plans as any[]) ?? [])
        .filter((p) => p.is_active)
        .map((p) => ({
          id: p.id,
          name: pick(p.name, p.name_en) ?? "",
          description: pick(p.description, p.description_en),
          price: p.price,
          interval: p.interval,
          features: Array.isArray(p.features) ? p.features.filter((f: unknown) => typeof f === "string") : [],
        }))
    : [];

  const data: SiteData = {
    slug: store.slug,
    name: store.name,
    logoUrl: custom?.logo_url ?? null,
    coverUrl: custom?.cover_image_url ?? null,
    description: (isEn ? custom?.description_en || custom?.description : custom?.description) ?? "",
    address: custom?.address || null,
    phone: custom?.phone || null,
    websiteUrl: custom?.website_url || null,
    instagramUrl: custom?.instagram_url || null,
    twitterUrl: custom?.twitter_url || null,
    primaryColor: custom?.primary_color ?? "#3B82F6",
    secondaryColor: custom?.secondary_color ?? "#1E40AF",
    services,
    images: imagesRes.data ?? [],
    plans,
    hours: hoursRes.data ?? [],
    showShop: features.productSales,
    hideBranding: features.hideBranding,
    isEn,
  };

  return { config: normalizeSiteConfig(custom?.site_config, defaultSiteConfig()), data };
}
