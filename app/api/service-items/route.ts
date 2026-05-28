import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const ServiceItemSchema = z.object({
  name: z.string().min(1).max(100),
  name_en: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  description_en: z.string().max(500).optional().nullable(),
  price: z.number().int().min(0).nullable().optional(),
  duration_minutes: z.number().int().min(1).max(480).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// 店舗のサービス一覧取得
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");
  if (!storeId) return apiError("store_id が必要です", 400);

  const { data, error } = await supabaseAdmin
    .from("service_items")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return apiError(error.message, 500);
  return Response.json({ items: data });
}

// サービス追加
export async function POST(request: NextRequest) {
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

  const result = ServiceItemSchema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  const { data, error } = await supabaseAdmin
    .from("service_items")
    .insert({ ...result.data, store_id: store.id })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return Response.json({ item: data }, { status: 201 });
}
