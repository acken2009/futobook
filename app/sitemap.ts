import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

  // 公開店舗一覧を取得
  const { data: stores } = await supabaseAdmin
    .from("stores")
    .select("slug, updated_at")
    .eq("status", "active");

  const storeUrls: MetadataRoute.Sitemap = (stores ?? []).flatMap((store) => [
    {
      url: `${appUrl}/store/${store.slug}`,
      lastModified: new Date(store.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${appUrl}/store/${store.slug}/reserve`,
      lastModified: new Date(store.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ]);

  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${appUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${appUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...storeUrls,
  ];
}
