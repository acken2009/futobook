import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/utils";
import { sendEmail } from "@/lib/email/send";
import { reservationCancellationEmail } from "@/lib/email/templates";
import { calcRefundAmount } from "@/lib/stripe/refund";
import { z } from "zod";

const CancelSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const result = CancelSchema.safeParse(body);
  if (!result.success) return apiError("トークンが必要です", 400);

  const { token } = result.data;

  // トークンで予約を取得
  const { data: reservation } = await supabaseAdmin
    .from("reservations")
    .select(`
      id, status, cancel_token_expires_at, reserved_at, party_size,
      customers(name, email),
      service_items(name),
      stores(id, name, slug, owner_id, stripe_account_id)
    `)
    .eq("cancel_token", token)
    .single();

  if (!reservation) return apiError("無効なキャンセルトークンです", 404);
  if (reservation.status === "cancelled") return apiError("すでにキャンセル済みです", 400);
  if (reservation.status === "completed") return apiError("完了済みの予約はキャンセルできません", 400);

  // 期限チェック
  if (
    !reservation.cancel_token_expires_at ||
    new Date() > new Date(reservation.cancel_token_expires_at)
  ) {
    return apiError(
      "キャンセル受付期限を過ぎています。店舗に直接お問い合わせください。",
      400
    );
  }

  // ── 返金処理（有料予約のみ）先に実行 ──
  let refundAmount = 0;
  let refundPct = 0;

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("stripe_payment_intent_id, amount")
    .contains("metadata", { reservation_id: reservation.id })
    .eq("status", "succeeded")
    .single();

  if (payment?.stripe_payment_intent_id && payment.amount > 0) {
    const { refundAmount: amt, refundPct: pct } = calcRefundAmount(
      payment.amount,
      reservation.reserved_at
    );
    refundAmount = amt;
    refundPct = pct;

    if (refundAmount > 0) {
      // Connect アカウント上のPaymentIntentを返金するため stripeAccount が必要
      const stripeAccountId = (reservation.stores as any)?.stripe_account_id;
      const refundOptions = stripeAccountId
        ? { stripeAccount: stripeAccountId }
        : undefined;

      try {
        await stripe.refunds.create(
          {
            payment_intent: payment.stripe_payment_intent_id,
            amount: refundAmount,
          },
          refundOptions
        );
        await supabaseAdmin
          .from("payments")
          .update({ status: "refunded" })
          .contains("metadata", { reservation_id: reservation.id });
      } catch (e) {
        console.error("Stripe refund failed:", e);
        return apiError("返金処理に失敗しました。店舗に直接お問い合わせください。", 500);
      }
    }
  }

  // 返金成功（または返金不要）後にキャンセル実行
  const { error } = await supabaseAdmin
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservation.id);

  if (error) return apiError("キャンセルに失敗しました", 500);

  const customer = reservation.customers as unknown as { name: string; email: string } | null;
  const service = reservation.service_items as unknown as { name: string } | null;
  const store = reservation.stores as unknown as { id: string; name: string; slug: string; owner_id: string; stripe_account_id: string | null } | null;

  // ① 顧客へキャンセル完了メール
  if (customer?.email && store) {
    const { subject, html } = reservationCancellationEmail({
      customerName: customer.name,
      storeName: store.name,
      reservedAt: reservation.reserved_at,
      serviceName: service?.name,
      partySize: reservation.party_size,
      storeSlug: store.slug,
      refundAmount: refundAmount > 0 ? refundAmount : undefined,
      refundPct: refundPct > 0 ? refundPct : undefined,
    });

    await sendEmail({
      to: customer.email,
      subject,
      html,
      storeId: store.id,
      type: "reservation_cancellation",
    });
  }

  // ② 店舗オーナーへキャンセル通知
  if (store?.owner_id) {
    const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(
      store.owner_id
    );
    if (ownerUser?.user?.email) {
      const date = new Date(reservation.reserved_at).toLocaleString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      await sendEmail({
        to: ownerUser.user.email,
        subject: `【キャンセル通知】${store.name} - ${date} ${customer?.name ?? ""}様`,
        html: `<p>${customer?.name ?? "お客様"}が ${date} の予約をキャンセルしました。</p>`,
        storeId: store.id,
        type: "reservation_cancellation",
      });
    }
  }

  return Response.json({ success: true, refundAmount, refundPct });
}
