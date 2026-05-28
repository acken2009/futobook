import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CustomizationForm } from "./customization-form";

export default async function CustomizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("*, store_customizations(*)")
    .eq("owner_id", user.id)
    .single();

  if (!store) redirect("/dashboard/onboarding");

  let images: { id: string; url: string }[] = [];
  try {
    const { data } = await supabaseAdmin
      .from("store_images")
      .select("id, url")
      .eq("store_id", store.id)
      .order("sort_order")
      .order("created_at");
    if (data) images = data;
  } catch {
    // table not yet created before migration
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">店舗カスタマイズ</h1>
      <p className="text-gray-500 mb-8">
        店舗ページの外観を自由にカスタマイズできます。
      </p>
      <CustomizationForm
        storeId={store.id}
        customization={(Array.isArray(store.store_customizations) ? store.store_customizations[0] : store.store_customizations) ?? null}
        initialImages={images}
      />
    </div>
  );
}
