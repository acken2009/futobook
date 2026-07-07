import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/utils";
import type Stripe from "stripe";

/**
 * POST /api/admin/init-plans
 * プラットフォームプランを Stripe + DB に作成・更新する管理エンドポイント。
 * 冪等: 既存プランは手数料・件数上限を更新し、不足しているStripe Price（月払い・年払い）を補完する。
 * Authorization: Bearer <ADMIN_SECRET>
 */

// 料金表（正）。年払いは「2ヶ月分無料」= 月額×10
const PLAN_DEFS = [
  {
    name: "スターター",
    price: 0,
    transaction_fee_pct: 0.049,
    max_reservations_per_month: 30,
  },
  {
    name: "ベーシック",
    price: 2980,
    transaction_fee_pct: 0.029,
    max_reservations_per_month: null,
  },
  {
    name: "スタンダード",
    price: 9800,
    transaction_fee_pct: 0.019,
    max_reservations_per_month: null,
  },
] as const;

async function ensurePrice(
  productId: string,
  unitAmount: number,
  interval: "month" | "year",
  nickname: string
): Promise<string> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const existing = prices.data.find(
    (p: Stripe.Price) =>
      p.recurring?.interval === interval && p.unit_amount === unitAmount
  );
  if (existing) return existing.id;

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: "jpy",
    recurring: { interval },
    nickname,
  });
  return price.id;
}

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

  const results = [];

  for (const plan of PLAN_DEFS) {
    const { data: existing } = await supabaseAdmin
      .from("platform_subscription_plans")
      .select("id, stripe_product_id, stripe_price_id")
      .eq("name", plan.name)
      .eq("is_active", true)
      .single();

    let stripePriceId = existing?.stripe_price_id ?? "price_free";
    let stripeProductId = existing?.stripe_product_id ?? "prod_free";

    if (plan.price > 0) {
      // Stripe Product を確保
      if (!stripeProductId || stripeProductId === "prod_free" || stripeProductId.startsWith("prod_placeholder")) {
        const product = await stripe.products.create({
          name: `Futobook ${plan.name}`,
          metadata: { plan_name: plan.name },
        });
        stripeProductId = product.id;
      }
      // 月払い・年払いのPriceを確保（年払いは2ヶ月分無料）
      stripePriceId = await ensurePrice(stripeProductId, plan.price, "month", `Futobook ${plan.name}（月払い）`);
      await ensurePrice(stripeProductId, plan.price * 10, "year", `Futobook ${plan.name}（年払い）`);
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from("platform_subscription_plans")
        .update({
          price: plan.price,
          transaction_fee_pct: plan.transaction_fee_pct,
          max_reservations_per_month: plan.max_reservations_per_month,
          stripe_price_id: stripePriceId,
          stripe_product_id: stripeProductId,
        })
        .eq("id", existing.id);
      results.push({ name: plan.name, status: error ? `error: ${error.message}` : "updated" });
    } else {
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
      results.push({ name: plan.name, status: error ? `error: ${error.message}` : "created" });
    }
  }

  return Response.json({ ok: true, results });
}
