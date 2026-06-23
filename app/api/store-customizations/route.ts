import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const CustomizationSchema = z.object({
  name: z.string().max(100).optional(),
  name_en: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  description_en: z.string().max(2000).optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logo_url: z.string().url().nullable().optional(),
  cover_image_url: z.string().url().nullable().optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  website_url: z.string().url().nullable().optional(),
  instagram_url: z.string().url().nullable().optional(),
  twitter_url: z.string().url().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!store) return apiError("店舗が見つかりません", 404);

  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const parsed = CustomizationSchema.safeParse(rawBody);
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

  const body = parsed.data;

  // まず全フィールド（description_en含む）で試みる
  const fullPayload = { store_id: store.id, ...body };
  const { error: fullError } = await supabaseAdmin
    .from("store_customizations")
    .upsert(fullPayload, { onConflict: "store_id" });

  if (!fullError) {
    return Response.json({ ok: true });
  }

  // description_en / name_en カラムが存在しない場合（マイグレーション未実行）は
  // それらを除いて再試行する
  if (fullError.message?.includes("column") || fullError.code === "42703") {
    const fallbackBody = Object.fromEntries(
      Object.entries(body).filter(([k]) => k !== "description_en" && k !== "name_en")
    );
    const { error: fallbackError } = await supabaseAdmin
      .from("store_customizations")
      .upsert({ store_id: store.id, ...fallbackBody }, { onConflict: "store_id" });

    if (!fallbackError) {
      return Response.json({
        ok: true,
        warning: "英語フィールドはデータベースのマイグレーション実行後に保存されます",
      });
    }
    return apiError(fallbackError.message, 500);
  }

  return apiError(fullError.message, 500);
}
