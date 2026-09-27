import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteRenderer } from "@/components/site/site-renderer";
import { loadStoreSite, STORE_SITE_SELECT } from "@/lib/site/load";

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

  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select(STORE_SITE_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  // 店舗サイト（テンプレート＋セクション構成）で描画。未設定の店舗は「シンプル」テンプレート
  const { config, data } = await loadStoreSite(store, lang === "en");
  return <SiteRenderer config={config} data={data} />;
}
