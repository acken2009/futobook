import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const ProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  price: z.number().int().min(1),
  stock_quantity: z.number().int().min(0).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// GET /api/products?store_id=xxx - 公開商品一覧（顧客向け）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");
  if (!storeId) return apiError("store_id が必要です", 400);

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return apiError(error.message, 500);
  return Response.json({ products: data });
}

// POST /api/products - 商品作成（管理者向け）
export async function POST(request: NextRequest) {
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

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = ProductSchema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({ ...result.data, store_id: store.id })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return Response.json({ product: data }, { status: 201 });
}
