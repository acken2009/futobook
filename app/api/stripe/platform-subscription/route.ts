import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const Schema = z.object({
  plan_id: z.string().uuid(),
});

/**
 * POST /api/stripe/platform-subscription
 * 店舗がプラットフォームプランに加入する Stripe Checkout セッションを作成
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = Schema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  const { plan_id } = result.data;

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (!store) return apiError("店舗が見つかりません", 404);

  const { data: plan } = await supabaseAdmin
    .from("platform_subscription_plans")
    .select("id, name, price, stripe_price_id")
    .eq("id", plan_id)
    .eq("is_active", true)
    .single();

  if (!plan) return apiError("プランが見つかりません", 404);
  if (plan.stripe_price_id === "price_placeholder_starter" ||
      plan.stripe_price_id.startsWith("price_placeholder")) {
    return apiError("Stripe Price IDが設定されていません。管理者にお問い合わせください。", 400);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // 既存のStripe Customerを検索、なければ作成
  const existingCustomers = await stripe.customers.list({ email: user.email!, limit: 1 });
  let stripeCustomerId: string;

  if (existingCustomers.data.length > 0) {
    stripeCustomerId = existingCustomers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: store.name,
      metadata: { store_id: store.id },
    });
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    subscription_data: {
      metadata: {
        store_id: store.id,
        plan_id: plan.id,
      },
    },
    success_url: `${appUrl}/dashboard/billing?plan=subscribed&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/billing`,
  });

  return Response.json({ url: session.url });
}
