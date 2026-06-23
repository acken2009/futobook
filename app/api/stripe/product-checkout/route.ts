import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { calculatePlatformFee } from "@/lib/stripe/fees";
import { apiError } from "@/lib/utils";
import { checkoutRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const Schema = z.object({
  store_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
  customer: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
  }),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = await checkoutRateLimit(ip);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = Schema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  const { store_id, product_id, quantity, customer } = result.data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return apiError("サーバー設定エラー", 500);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, name, slug, stripe_account_id, stripe_account_status, platform_plan_id")
    .eq("id", store_id)
    .single();

  if (!store) return apiError("店舗が見つかりません", 404);
  if (store.stripe_account_status !== "active")
    return apiError("この店舗は現在決済を受け付けていません", 400);

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", product_id)
    .eq("store_id", store_id)
    .eq("is_active", true)
    .single();

  if (!product) return apiError("商品が見つかりません", 404);
  if (product.stock_quantity !== null && product.stock_quantity < quantity)
    return apiError("在庫が不足しています", 400);

  // プラットフォーム手数料率（デフォルト5%）
  let platformFeePct = 0.05;
  if (store.platform_plan_id) {
    const { data: plan } = await supabaseAdmin
      .from("platform_subscription_plans")
      .select("transaction_fee_pct")
      .eq("id", store.platform_plan_id)
      .single();
    if (plan) {
      const parsed = Number(plan.transaction_fee_pct);
      if (!isNaN(parsed) && parsed >= 0) platformFeePct = parsed;
    }
  }

  const totalAmount = product.price * quantity;
  const fee = calculatePlatformFee(totalAmount, platformFeePct);

  // 顧客レコード取得 or 作成
  const { data: existingCustomer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("store_id", store_id)
    .eq("email", customer.email)
    .single();

  let customerId: string | null = null;
  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert({ store_id, email: customer.email, name: customer.name })
      .select("id")
      .single();
    if (customerError || !newCustomer) return apiError("顧客情報の保存に失敗しました", 500);
    customerId = newCustomer.id;
  }

  // pending注文を先に作成
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      store_id,
      customer_id: customerId,
      customer_name: customer.name,
      customer_email: customer.email,
      status: "pending",
      total_amount: totalAmount,
      platform_fee: fee,
    })
    .select("id")
    .single();

  if (orderError || !order) return apiError("注文の作成に失敗しました", 500);

  // 注文明細
  const { error: itemError } = await supabaseAdmin.from("order_items").insert({
    order_id: order.id,
    product_id,
    product_name: product.name,
    quantity,
    unit_price: product.price,
  });

  if (itemError) {
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
    return apiError("注文明細の作成に失敗しました", 500);
  }

  // Stripe Checkoutセッション作成（失敗時はDBをクリーンアップ）
  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: customer.email,
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: { name: product.name },
              unit_amount: product.price,
            },
            quantity,
          },
        ],
        payment_intent_data: {
          application_fee_amount: fee,
          metadata: { type: "product_order", order_id: order.id, store_id },
        },
        metadata: { type: "product_order", order_id: order.id, store_id },
        success_url: `${appUrl}/store/${store.slug}/shop/success?order_id=${order.id}`,
        cancel_url: `${appUrl}/store/${store.slug}/shop`,
      },
      { stripeAccount: store.stripe_account_id! }
    );
  } catch (err) {
    await supabaseAdmin.from("order_items").delete().eq("order_id", order.id);
    await supabaseAdmin.from("orders").delete().eq("id", order.id);
    console.error("Stripe checkout session creation failed:", err);
    return apiError("決済セッションの作成に失敗しました", 500);
  }

  // セッションIDを注文に紐付け
  await supabaseAdmin
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", order.id);

  return Response.json({ url: session.url });
}
