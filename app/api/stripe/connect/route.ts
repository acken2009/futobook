import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/utils";

/**
 * POST /api/stripe/connect
 * Stripe Connect Express アカウントを作成し、オンボーディングURLを返す
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  // オーナーの店舗を取得
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, name, stripe_account_id, stripe_account_status")
    .eq("owner_id", user.id)
    .single();

  if (!store) return apiError("店舗が見つかりません", 404);

  let accountId = store.stripe_account_id;

  // Stripeアカウントが未作成の場合は新規作成
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "JP",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: store.name,
      },
      settings: {
        payouts: {
          schedule: {
            interval: "weekly",
            weekly_anchor: "monday",
          },
        },
      },
    });

    accountId = account.id;

    // DBに保存
    await supabaseAdmin
      .from("stores")
      .update({
        stripe_account_id: accountId,
        stripe_account_status: "pending",
      })
      .eq("id", store.id);
  }

  // オンボーディングリンクを生成
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/dashboard/billing?connect=refresh`,
    return_url: `${appUrl}/dashboard/billing?connect=success`,
    type: "account_onboarding",
  });

  return Response.json({ url: accountLink.url });
}

/**
 * GET /api/stripe/connect
 * Connect アカウントの状態を確認しDBを更新する
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, stripe_account_id")
    .eq("owner_id", user.id)
    .single();

  if (!store?.stripe_account_id) {
    return Response.json({ status: "not_connected" });
  }

  const account = await stripe.accounts.retrieve(store.stripe_account_id);
  const status =
    account.charges_enabled && account.payouts_enabled
      ? "active"
      : account.details_submitted
      ? "restricted"
      : "pending";

  await supabaseAdmin
    .from("stores")
    .update({ stripe_account_status: status })
    .eq("id", store.id);

  return Response.json({
    status,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
  });
}
