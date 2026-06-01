import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { calculatePlatformFee, calculateSubscriptionFeePercent } from "@/lib/stripe/fees";
import { apiError } from "@/lib/utils";
import { checkoutRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const CheckoutSchema = z.object({
  type: z.enum(["reservation", "subscription"]),
  store_id: z.string().uuid(),
  // 予約決済用
  reservation_id: z.string().uuid().optional(),
  // サブスク決済用（顧客向け）
  plan_id: z.string().uuid().optional(),
  customer: z
    .object({
      name: z.string(),
      email: z.string().email(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  // レートリミット: IPアドレスベース（1分に5回まで）
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = await checkoutRateLimit(ip);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const result = CheckoutSchema.safeParse(body);
  if (!result.success) {
    return apiError(result.error.errors[0].message, 400);
  }

  const { type, store_id } = result.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // 店舗情報取得
  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, name, slug, stripe_account_id, stripe_account_status, platform_plan_id")
    .eq("id", store_id)
    .single();

  if (storeError || !store) return apiError("店舗が見つかりません", 404);

  if (store.stripe_account_status !== "active") {
    return apiError("この店舗は現在決済を受け付けていません", 400);
  }

  // プラットフォーム手数料率（プランによって異なる、デフォルト5%）
  let platformFeePct = 0.05;
  if (store.platform_plan_id) {
    const { data: plan } = await supabaseAdmin
      .from("platform_subscription_plans")
      .select("transaction_fee_pct")
      .eq("id", store.platform_plan_id)
      .single();
    if (plan) platformFeePct = Number(plan.transaction_fee_pct);
  }

  // ============================================================
  // 予約決済
  // ============================================================
  if (type === "reservation" && result.data.reservation_id) {
    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select("id, total_amount, status, customers(email, name, stripe_customer_id)")
      .eq("id", result.data.reservation_id)
      .eq("store_id", store_id)
      .single();

    if (!reservation) return apiError("予約が見つかりません", 404);
    if (!reservation.total_amount) return apiError("金額が設定されていません", 400);
    if (reservation.status === "confirmed")
      return apiError("この予約はすでに支払い済みです", 400);

    const customer = reservation.customers as any;
    const fee = calculatePlatformFee(reservation.total_amount, platformFeePct);

    // Stripe Checkoutセッション（予約決済）
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: customer.email,
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: { name: `${store.name} - ご予約` },
              unit_amount: reservation.total_amount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: fee,
          metadata: {
            reservation_id: reservation.id,
            store_id: store_id,
          },
        },
        success_url: `${appUrl}/store/${store.slug}/reserve/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/store/${store.slug}/reserve`,
      },
      { stripeAccount: store.stripe_account_id! }
    );

    // paymentsテーブルに仮記録
    await supabaseAdmin.from("payments").insert({
      store_id,
      customer_id: null, // Webhook完了後に更新
      type: "reservation",
      status: "pending",
      amount: reservation.total_amount,
      platform_fee: fee,
      stripe_payment_intent_id: session.payment_intent as string,
      metadata: { reservation_id: reservation.id, session_id: session.id },
    });

    return Response.json({ url: session.url });
  }

  // ============================================================
  // 顧客サブスク決済
  // ============================================================
  if (type === "subscription" && result.data.plan_id && result.data.customer) {
    const { data: plan } = await supabaseAdmin
      .from("store_subscription_plans")
      .select("id, name, price, stripe_price_id, interval")
      .eq("id", result.data.plan_id)
      .eq("store_id", store_id)
      .eq("is_active", true)
      .single();

    if (!plan) return apiError("プランが見つかりません", 404);
    if (!plan.stripe_price_id)
      return apiError("このプランはまだ決済設定が完了していません", 400);

    const appFeePercent = calculateSubscriptionFeePercent(platformFeePct);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: result.data.customer.email,
        line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
        subscription_data: {
          application_fee_percent: appFeePercent,
          metadata: {
            store_id,
            plan_id: plan.id,
            customer_email: result.data.customer.email,
            customer_name: result.data.customer.name,
          },
        },
        success_url: `${appUrl}/store/${store.slug}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/store/${store.slug}/subscribe`,
      },
      { stripeAccount: store.stripe_account_id! }
    );

    return Response.json({ url: session.url });
  }

  return apiError("Invalid request parameters", 400);
}
