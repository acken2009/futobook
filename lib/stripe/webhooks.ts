import Stripe from "stripe";
import { stripe } from "./client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { sendLineMessage } from "@/lib/line/send";
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
  if (!subscriptionId) {
    console.warn("handlePlatformInvoicePaid: missing subscriptionId", invoice.id);
    return;
  }

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
  if (!metadata?.reservation_id) {
    console.warn("handlePaymentIntentSucceeded: missing reservation_id in metadata", paymentIntent.id);
  }

  if (metadata?.reservation_id) {
    await supabaseAdmin
      .from("reservations")
      .update({ status: "confirmed" })
      .eq("id", metadata.reservation_id);

    // 予約確認メール
    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select(`
        reserved_at, party_size, cancel_token, customer_id,
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

      // payments の customer_id を更新（checkout時はnullで作成されるため）
      if (reservation.customer_id) {
        await supabaseAdmin
          .from("payments")
          .update({ customer_id: reservation.customer_id })
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .is("customer_id", null);
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const cancelUrl = reservation.cancel_token
        ? `${appUrl}/store/${store.slug}/reserve/cancel?token=${reservation.cancel_token}`
        : undefined;

      const { subject, html } = reservationConfirmationEmail({
        customerName: customer.name,
        storeName: store.name,
        reservedAt: reservation.reserved_at,
        serviceName: service?.name,
        partySize: reservation.party_size,
        storeSlug: store.slug,
        cancelUrl,
      });

      await sendEmail({
        to: customer.email,
        subject,
        html,
        storeId: metadata.store_id,
        type: "reservation_confirmation",
      });

      // LINE通知
      const { data: customerWithLine } = await supabaseAdmin
        .from("customers")
        .select("line_user_id")
        .eq("id", reservation.customer_id)
        .single();
      const lineUserId = (customerWithLine as any)?.line_user_id;
      if (lineUserId) {
        const dateStr = new Date(reservation.reserved_at).toLocaleString("ja-JP", {
          month: "long", day: "numeric", weekday: "short",
          hour: "2-digit", minute: "2-digit",
        });
        const lineMsg = `✅ 予約確定！\n${store.name}\n${dateStr}${service?.name ? `\n${service.name}` : ""}${reservation.cancel_token ? `\n\nキャンセルはこちら:\n${process.env.NEXT_PUBLIC_APP_URL}/store/${store.slug}/reserve/cancel?token=${reservation.cancel_token}` : ""}`;
        await sendLineMessage({ lineUserId, message: lineMsg, storeId: metadata.store_id });
      }
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
  // Stripeは "canceled"（一重L）、DBは "cancelled"（二重L）で統一
  const normalizedStatus = subscription.status === "canceled" ? "cancelled" : subscription.status;
  await supabaseAdmin
    .from("customer_subscriptions")
    .update({
      status: normalizedStatus,
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

/**
 * 物販注文の決済完了（Connect: checkout.session.completed）
 */
export async function handleProductOrderCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const { order_id, store_id } = session.metadata ?? {};
  if (!order_id || !store_id) return;

  // 注文をpaid状態に更新
  await supabaseAdmin
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id: session.payment_intent as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order_id);

  // 在庫を減らす
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", order_id);

  if (items) {
    for (const item of items) {
      // アトミックなデクリメント（0008_fixes.sql で定義したRPC）
      await supabaseAdmin.rpc("decrement_stock", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
    }
  }

  // 確認メール送信
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(product_name, quantity, unit_price)")
    .eq("id", order_id)
    .single();

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("name, owner_id")
    .eq("id", store_id)
    .single();

  if (order && store) {
    const itemsText = (order.order_items as any[])
      .map((i: any) => `${i.product_name} × ${i.quantity}`)
      .join("\n");

    await sendEmail({
      to: order.customer_email,
      subject: `【${store.name}】ご注文ありがとうございます`,
      html: `<p>${order.customer_name} 様</p>
<p>ご注文を承りました。</p>
<p><strong>注文内容</strong></p>
<pre>${itemsText}</pre>
<p>合計: ¥${order.total_amount.toLocaleString()}</p>
<p>ご不明な点は店舗までお問い合わせください。</p>`,
      storeId: store_id,
      type: "order_confirmation",
    });

    // オーナーへの通知
    if (store.owner_id) {
      const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(store.owner_id);
      if (ownerUser?.user?.email) {
        await sendEmail({
          to: ownerUser.user.email,
          subject: `【${store.name}】新しい注文が入りました`,
          html: `<p>注文者: ${order.customer_name}（${order.customer_email}）</p>
<pre>${itemsText}</pre>
<p>合計: ¥${(order.total_amount ?? 0).toLocaleString()}</p>`,
          storeId: store_id,
          type: "order_notification",
        });
      }
    }
  }
}
