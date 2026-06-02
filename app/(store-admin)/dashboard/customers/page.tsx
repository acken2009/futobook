import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomersView } from "./customers-view";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!store) redirect("/dashboard/onboarding");

  const { data: customers } = await supabase
    .from("customers")
    .select(`
      id, name, email, phone, internal_notes, created_at,
      reservations(id, reserved_at, status, party_size, service_items(name))
    `)
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });

  return <CustomersView customers={(customers as any) ?? []} />;
}
