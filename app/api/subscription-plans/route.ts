import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const CreatePlanSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  price: z.number().int().min(1),
  interval: z.enum(["month", "year"]),
  features: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = CreatePlanSchema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  // 店舗の所有権確認
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("id", result.data.store_id)
    .eq("owner_id", user.id)
    .single();

  if (!store) return apiError("権限がありません", 403);

  const { data: plan, error } = await supabaseAdmin
    .from("store_subscription_plans")
    .insert({
      store_id: result.data.store_id,
      name: result.data.name,
      description: result.data.description ?? null,
      price: result.data.price,
      interval: result.data.interval,
      features: result.data.features ?? [],
      is_active: false, // Stripe Price IDが設定されるまで非公開
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return Response.json({ plan }, { status: 201 });
}
