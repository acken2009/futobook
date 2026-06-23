import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const LineSettingsSchema = z.object({
  line_channel_access_token: z.string().min(1).max(500),
  line_channel_secret: z.string().min(1).max(100),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("line_channel_access_token, line_channel_secret")
    .eq("owner_id", user.id)
    .single();

  if (!store) return apiError("店舗が見つかりません", 404);

  const mask = (val: string | null) =>
    val ? val.slice(0, 8) + "..." : "";

  return Response.json({
    line_channel_access_token: mask((store as any).line_channel_access_token),
    line_channel_secret: mask((store as any).line_channel_secret),
    configured: !!(store as any).line_channel_access_token && !!(store as any).line_channel_secret,
  });
}

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

  const parsed = LineSettingsSchema.safeParse(rawBody);
  if (!parsed.success) return apiError(parsed.error.errors[0].message, 400);

  const { line_channel_access_token, line_channel_secret } = parsed.data;

  const { error } = await supabaseAdmin
    .from("stores")
    .update({
      line_channel_access_token,
      line_channel_secret,
    } as any)
    .eq("id", store.id);

  if (error) return apiError(error.message, 500);
  return Response.json({ ok: true });
}
