import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 認証確認
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  // 店舗オーナー確認
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!store) return apiError("店舗が見つかりません", 404);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = UpdateSchema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  // 予約が自分の店舗のものか確認してから更新
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({ status: result.data.status })
    .eq("id", id)
    .eq("store_id", store.id)
    .select("id")
    .single();

  if (error || !data) return apiError("更新に失敗しました", 500);

  return Response.json({ ok: true });
}
