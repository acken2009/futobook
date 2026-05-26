import Stripe from "stripe";
import { stripe } from "./client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import {
  reservationConfirmationEmail,
  subscriptionConfirmationEmail,
} from "@/lib/email/templates";

/**
 * Stripe Webhookシグネチャ検証
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<Stripe.Event> {
  return stripe.webhooks.constructEventAsync(body, signature, secret);
}

/**
 * 冪等性チェック: 未処理なら登録してtrue、処理済みならfalseを返す
 */
export async function markEventAsProcessed(
  stripeEventId: string,
  eventType: string
): Promise<boolean> {
  const { error } = await supabaseAdmin.from("webhook_events").insert({
    stripe_event_id: stripeEventId,
    type: eventType,
  });

  if (error) {
    if (error.code === "23505") return false; // 重複 = 処理済み
    throw error;
  }
  return true;
}

// ============================================================
// プラットフォームアカウントイベント
// ============================================================

/**
 * 店舗の月額プラットフォーム課金完了
 */
export async function handlePlatformInvoicePaid(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  await supabaseAdmin
    .from("store_platform_subscriptions")
    .update({
      status: "active",
      current_period_start: new Date(
        (invoice.period_start as number) * 1000
      ).toISOString(),
      current_period_end: new Date(
        (invoice.period_end as number) * 1000
      ).toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
}

/**
 * 店舗の月額課金失敗
 */
export async function handlePlatformInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  await supabaseAdmin
    .from("store_platform_subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);

  // 店舗オーナーへ通知
  const { data: sub } = await supabaseAdmin
    .from("store_platform_subscriptions")
    .select("stores(owner_id, name)")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (sub) {
    const { data: owner } = await supabaseAdmin.auth.admin.getUserById(
      (sub.stores as any).owner_id
    );
    if (owner.user?.email) {
      await sendEmail({
        to: owner.user.email,
        subject: `【重要】${(sub.stores as any).name} のプラットフォーム利用料の支払いに失敗しました`,
        html: `<p>プラットフォーム利用料の支払いが失敗しました。お支払い情報をご確認ください。</p>`,
        type: "platform_payment_failed",
      });
    }
  }
}

/**
 * Stripe Connect onboarding 完了
 */
export async function handleAccountUpdated(
  account: Stripe.Account
): Promise<void> {
  const isActive = account.charges_enabled && account.payouts_enabled;
  const status = isActive
    ? "active"
    : account.details_submitted
    ? "restricted"
    : "pending";

  await supabaseAdmin
    .from("stores")
    .update({ stripe_account_status: status })
    .eq("stripe_account_id", account.id);
}

/**
 * プラットフォームサブスクリプション作成（店舗のプラン加入）
 */
export async function handlePlatformSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const { store_id, plan_id } = subscription.metadata;
  if (!store_id || !plan_id) return;

  await supabaseAdmin
    .from("store_platform_subscriptions")
    .upsert({
      store_id,
      plan_id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    });

  // 店舗のplatform_plan_idを更新
  await supabaseAdmin
    .from("stores")
    .update({ platform_plan_id: plan_id })
    .eq("id", store_id);
}

// ============================================================
// Connect アカウントイベント（顧客決済）
// ============================================================

/**
 * 顧客決済成功
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  _connectedAccountId: string
): Promise<void> {
  const { metadata } = paymentIntent;

  // payments テーブル更新
  await supabaseAdmin
    .from("payments")
    .update({
      status: "succeeded",
      stripe_charge_id: paymentIntent.latest_charge as string,
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  // 予約の確定 + メール送信
  if (metadata?.reservation_id) {
    await supabaseAdmin
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", metadata.reservation_id);

    // 予約確認メール
    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select(`
        reserved_at, party_size,
        customers(name, email),
        service_items(name),
        stores(name, slug)
      `)
      .eq("id", metadata.reservation_id)
      .single();

    if (reservation) {
      const customer = reservation.customers as any;
      const store = reservation.stores as any;
      const service = reservation.service_items as any;

      const { subject, html } = reservationConfirmationEmail({
        customerName: customer.name,
        storeName: store.name,
        reservedAt: reservation.reserved_at,
        serviceName: service?.name,
        partySize: reservation.party_size,
        storeSlug: store.slug,
      });

      await sendEmail({
        to: customer.email,
        subject,
        html,
        storeId: metadata.store_id,
        type: "reservation_confirmation",
      });
    }
  }
}

/**
 * 顧客サブスク作成（Connect）
 */
export async function handleCustomerSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const { store_id, plan_id, customer_email, customer_name } =
    subscription.metadata;
  if (!store_id || !plan_id) return;

  // 顧客を検索または作成
  let customerId: string;
  const { data: existingCustomer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("store_id", store_id)
    .eq("email", customer_email)
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer } = await supabaseAdmin
      .from("customers")
      .insert({
        store_id,
        email: customer_email,
        name: customer_name ?? "未設定",
        stripe_customer_id: subscription.customer as string,
      })
      .select("id")
      .single();
    customerId = newCustomer!.id;
  }

  // customer_subscriptions に記録
  await supabaseAdmin.from("customer_subscriptions").insert({
    store_id,
    customer_id: customerId,
    plan_id,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
  });

  // サブスク加入確認メール
  const { data: plan } = await supabaseAdmin
    .from("store_subscription_plans")
    .select("name, price, interval, stores(name)")
    .eq("id", plan_id)
    .single();

  if (plan) {
    const { subject, html } = subscriptionConfirmationEmail({
      customerName: customer_name ?? "お客様",
      storeName: (plan.stores as any).name,
      planName: plan.name,
      price: plan.price,
      interval: plan.interval as "month" | "year",
      nextBillingDate: new Date(
        subscription.current_period_end * 1000
      ).toLocaleDateString("ja-JP"),
    });

    await sendEmail({
      to: customer_email,
      subject,
      html,
      storeId: store_id,
      type: "subscription_confirmation",
    });
  }
}

/**
 * 顧客サブスク更新（Connect）
 */
export async function handleCustomerSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  await supabaseAdmin
    .from("customer_subscriptions")
    .update({
      status: subscription.status as string,
      current_period_start: new Date(
        subscription.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      cancelled_at:
        subscription.status === "canceled"
          ? new Date().toISOString()
          : null,
    })
    .eq("stripe_subscription_id", subscription.id);
}
