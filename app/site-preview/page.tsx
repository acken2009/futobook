import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadStoreSite, STORE_SITE_SELECT } from "@/lib/site/load";
import { PreviewClient } from "./preview-client";

export const metadata: Metadata = {
  title: "プレビュー",
  robots: { index: false, follow: false },
};

/**
 * サイト作成画面（/dashboard/site）の iframe 内で表示するプレビュー。
 * 保存前の編集内容は親ウィンドウから postMessage で受け取る。
 */
export default async function SitePreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select(STORE_SITE_SELECT)
    .eq("owner_id", user.id)
    .single();
  if (!store) redirect("/dashboard/onboarding");

  const { config, data } = await loadStoreSite(store, false);
  return <PreviewClient initialConfig={config} data={data} />;
}
