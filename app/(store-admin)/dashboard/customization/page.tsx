import { createClient } from "@/lib/supabase/server";
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

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">店舗カスタマイズ</h1>
      <p className="text-gray-500 mb-8">
        店舗ページの外観を自由にカスタマイズできます。
      </p>
      <CustomizationForm
        storeId={store.id}
        customization={(Array.isArray(store.store_customizations) ? store.store_customizations[0] : store.store_customizations) ?? null}
      />
    </div>
  );
}
