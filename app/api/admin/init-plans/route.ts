import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/utils";

/**
 * POST /api/admin/init-plans
 * プラットフォームプランを Stripe + DB に一括作成する初期設定エンドポイント。
 * Authorization: Bearer <ADMIN_SECRET>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.ADMIN_SECRET || authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return apiError("Unauthorized", 401);
  }

  // 既存のプレースホルダープランを非アクティブ化
  await supabaseAdmin
    .from("platform_subscription_plans")
    .update({ is_active: false })
    .like("stripe_price_id", "price_placeholder%");

  const newPlans = [
    {
      name: "スターター",
      price: 0,
      transaction_fee_pct: 0.05,
      max_reservations_per_month: 20,
    },
    {
      name: "ベーシック",
      price: 2980,
      transaction_fee_pct: 0.03,
      max_reservations_per_month: null,
    },
    {
      name: "スタンダード",
      price: 9800,
      transaction_fee_pct: 0.02,
      max_reservations_per_month: null,
    },
  ];

  const results = [];

  for (const plan of newPlans) {
    // 同名プランが既にアクティブなら skip
    const { data: existing } = await supabaseAdmin
      .from("platform_subscription_plans")
      .select("id")
      .eq("name", plan.name)
      .eq("is_active", true)
      .single();

    if (existing) {
      results.push({ name: plan.name, status: "skipped (already active)" });
      continue;
    }

    let stripePriceId = "price_free";
    let stripeProductId = "prod_free";

    if (plan.price > 0) {
      const product = await stripe.products.create({
        name: `Futobook ${plan.name}`,
        metadata: { plan_name: plan.name },
      });
      stripeProductId = product.id;

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: "jpy",
        recurring: { interval: "month" },
        nickname: `Futobook ${plan.name}`,
      });
      stripePriceId = price.id;
    }

    const { error } = await supabaseAdmin
      .from("platform_subscription_plans")
      .insert({
        name: plan.name,
        price: plan.price,
        transaction_fee_pct: plan.transaction_fee_pct,
        max_reservations_per_month: plan.max_reservations_per_month,
        stripe_price_id: stripePriceId,
        stripe_product_id: stripeProductId,
        is_active: true,
      });

    results.push({
      name: plan.name,
      status: error ? `error: ${error.message}` : "created",
      stripe_price_id: stripePriceId,
    });
  }

  return Response.json({ ok: true, results });
}
