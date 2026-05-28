import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const CreatePlanSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  name_en: z.string().max(100).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  description_en: z.string().max(500).nullable().optional(),
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

  // 店舗の所有権 + Stripeアカウント確認
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, name, stripe_account_id, stripe_account_status")
    .eq("id", result.data.store_id)
    .eq("owner_id", user.id)
    .single();

  if (!store) return apiError("権限がありません", 403);

  let stripeProductId: string | null = null;
  let stripePriceId: string | null = null;

  // Stripe連携済みの場合はProduct/Priceを自動作成
  if (store.stripe_account_id && store.stripe_account_status === "active") {
    try {
      // Stripe Product 作成（接続アカウント上）
      const product = await stripe.products.create(
        {
          name: result.data.name,
          description: result.data.description ?? undefined,
        },
        { stripeAccount: store.stripe_account_id }
      );
      stripeProductId = product.id;

      // Stripe Price 作成
      const price = await stripe.prices.create(
        {
          product: product.id,
          unit_amount: result.data.price,
          currency: "jpy",
          recurring: { interval: result.data.interval },
        },
        { stripeAccount: store.stripe_account_id }
      );
      stripePriceId = price.id;
    } catch (err) {
      console.error("Stripe product/price creation failed:", err);
      // Stripe失敗してもDBには保存する（手動設定可能に）
    }
  }

  const { data: plan, error } = await supabaseAdmin
    .from("store_subscription_plans")
    .insert({
      store_id: result.data.store_id,
      name: result.data.name,
      name_en: result.data.name_en ?? null,
      description: result.data.description ?? null,
      description_en: result.data.description_en ?? null,
      price: result.data.price,
      interval: result.data.interval,
      features: result.data.features ?? [],
      is_active: !!stripePriceId, // Stripe Price IDがあれば即公開
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return Response.json({ plan }, { status: 201 });
}
