import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().int().min(0).optional(),
  stock_quantity: z.number().int().min(0).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

async function getOwnerStoreId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .single();
  return data?.id ?? null;
}

// PUT /api/products/[id] - 商品更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const storeId = await getOwnerStoreId(user.id);
  if (!storeId) return apiError("店舗が見つかりません", 404);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = UpdateSchema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({ ...result.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("商品が見つかりません", 404);
  return Response.json({ product: data });
}

// DELETE /api/products/[id] - 商品削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const storeId = await getOwnerStoreId(user.id);
  if (!storeId) return apiError("店舗が見つかりません", 404);

  const { data, error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id")
    .single();

  if (error) return apiError(error.message, 500);
  if (!data) return apiError("商品が見つかりません", 404);
  return Response.json({ success: true });
}
