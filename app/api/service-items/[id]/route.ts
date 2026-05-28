import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  name_en: z.string().max(100).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  description_en: z.string().max(500).nullable().optional(),
  price: z.number().int().min(0).nullable().optional(),
  duration_minutes: z.number().int().min(1).max(480).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

async function getStoreId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .single();
  return data?.id ?? null;
}

// サービス更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const storeId = await getStoreId(user.id);
  if (!storeId) return apiError("店舗が見つかりません", 404);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = UpdateSchema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  const { data, error } = await supabaseAdmin
    .from("service_items")
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("見つかりません", 404);
  return Response.json({ item: data });
}

// サービス削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const storeId = await getStoreId(user.id);
  if (!storeId) return apiError("店舗が見つかりません", 404);

  const { error } = await supabaseAdmin
    .from("service_items")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return apiError(error.message, 500);
  return new Response(null, { status: 204 });
}
