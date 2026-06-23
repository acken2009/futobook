import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";

// GET /api/products/admin - 管理者向け商品一覧（非公開含む）
export async function GET() {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!store) return apiError("店舗が見つかりません", 404);

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return apiError(error.message, 500);
  return Response.json({ products: data ?? [] });
}
