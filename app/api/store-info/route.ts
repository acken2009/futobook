import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";

// GET /api/store-info?slug=xxx - 公開店舗情報
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) return apiError("slug が必要です", 400);

  const { data, error } = await supabaseAdmin
    .from("stores")
    .select("id, name, slug, stripe_account_status")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !data) return apiError("店舗が見つかりません", 404);
  return Response.json({ store: data });
}
