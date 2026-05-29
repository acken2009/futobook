import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { sendEmail } from "@/lib/email/send";
import { reservationCancellationEmail } from "@/lib/email/templates";
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
      stores(id, name, slug, owner_id)
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

  // キャンセル実行
  const { error } = await supabaseAdmin
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservation.id);

  if (error) return apiError("キャンセルに失敗しました", 500);

  const customer = reservation.customers as unknown as { name: string; email: string } | null;
  const service = reservation.service_items as unknown as { name: string } | null;
  const store = reservation.stores as unknown as { id: string; name: string; slug: string; owner_id: string } | null;

  // ① 顧客へキャンセル完了メール
  if (customer?.email && store) {
    const { subject, html } = reservationCancellationEmail({
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

  return Response.json({ success: true });
}
