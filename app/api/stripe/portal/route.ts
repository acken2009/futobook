import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/utils";
import { z } from "zod";

const Schema = z.object({
  store_id: z.string().uuid(),
  customer_email: z.string().email(),
});

/**
 * POST /api/stripe/portal
 * 顧客がサブスクをセルフ管理できるStripe Billing Portalへのリンクを生成
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = Schema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  const { store_id, customer_email } = result.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // 店舗のStripeアカウントIDを取得
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("stripe_account_id, slug")
    .eq("id", store_id)
    .single();

  if (!store?.stripe_account_id) {
    return apiError("この店舗は決済設定がされていません", 400);
  }

  // ConnectアカウントのStripe Customerを検索
  const customers = await stripe.customers.list(
    { email: customer_email, limit: 1 },
    { stripeAccount: store.stripe_account_id }
  );

  if (customers.data.length === 0) {
    return apiError("お客様情報が見つかりません", 404);
  }

  const portalSession = await stripe.billingPortal.sessions.create(
    {
      customer: customers.data[0].id,
      return_url: `${appUrl}/store/${store.slug}`,
    },
    { stripeAccount: store.stripe_account_id }
  );

  return Response.json({ url: portalSession.url });
}
