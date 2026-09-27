import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSiteConfig } from "@/lib/site/config";
import { defaultSiteConfig } from "@/lib/site/templates";
import { customizationOf } from "@/lib/site/load";
import { SiteEditor } from "./site-editor";

export default async function SiteBuilderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id, slug, store_customizations(*)")
    .eq("owner_id", user.id)
    .single();
  if (!store) redirect("/dashboard/onboarding");

  const custom = customizationOf(store);
  const saved = custom?.site_config ?? null;

  return (
    <div className="h-full">
      <SiteEditor
        slug={store.slug}
        initialConfig={normalizeSiteConfig(saved, defaultSiteConfig())}
        initialPrimary={custom?.primary_color ?? "#3B82F6"}
        initialSecondary={custom?.secondary_color ?? "#1E40AF"}
        isFirstTime={!saved}
      />
    </div>
  );
}
