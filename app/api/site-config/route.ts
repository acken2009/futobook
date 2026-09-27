import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { siteConfigSchema } from "@/lib/site/config";
import { z } from "zod";

const MAX_BODY_BYTES = 200 * 1024;

const BodySchema = z.object({
  site_config: siteConfigSchema,
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

/** 店舗サイト（テンプレート・テーマ・セクション構成）と配色を保存 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!store) return apiError("店舗が見つかりません", 404);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return apiError("サイト設定が大きすぎます", 413);

  let rawBody: unknown;
  try { rawBody = JSON.parse(text); } catch { return apiError("Invalid JSON", 400); }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.errors[0];
    return apiError(`入力内容に誤りがあります: ${issue.message}`, 400);
  }

  const { site_config, primary_color, secondary_color } = parsed.data;

  const { error } = await supabaseAdmin
    .from("store_customizations")
    .upsert(
      { store_id: store.id, site_config, primary_color, secondary_color },
      { onConflict: "store_id" }
    );

  if (error) {
    if (error.code === "42703" || error.message?.includes("site_config")) {
      return apiError("データベースの更新（マイグレーション 0010_site_config.sql）が未実行です", 503);
    }
    return apiError(error.message, 500);
  }

  return Response.json({ ok: true });
}
