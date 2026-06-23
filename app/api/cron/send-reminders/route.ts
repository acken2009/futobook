import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { sendLineMessage } from "@/lib/line/send";
import { reservationReminderEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

// Vercel Cron: 毎時0分に実行
// 予約の24時間前（±30分ウィンドウ）にリマインダーメールを送信
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // 毎時実行：24時間後±30分の予約を対象（重複防止のため reminder_sent_at IS NULL 条件を追加）
  const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();

  const { data: reservations, error } = await supabaseAdmin
    .from("reservations")
    .select(`
      id, reserved_at, party_size, cancel_token,
      customers(name, email),
      service_items(name),
      stores(id, name, slug)
    `)
    .eq("status", "confirmed")
    .gte("reserved_at", windowStart)
    .lte("reserved_at", windowEnd)
    .is("reminder_sent_at", null);

  if (error) {
    console.error("[cron] send-reminders query error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const reservation of reservations ?? []) {
    const customer = reservation.customers as unknown as { name: string; email: string } | null;
    const store = reservation.stores as unknown as { id: string; name: string; slug: string } | null;
    const service = reservation.service_items as unknown as { name: string } | null;

    if (!customer?.email || !store) continue;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const cancelUrl = reservation.cancel_token
      ? `${appUrl}/store/${store.slug}/reserve/cancel?token=${reservation.cancel_token}`
      : undefined;

    const { subject, html } = reservationReminderEmail({
      customerName: customer.name,
      storeName: store.name,
      reservedAt: reservation.reserved_at,
      serviceName: service?.name,
      partySize: reservation.party_size,
      storeSlug: store.slug,
      cancelUrl,
    });

    try {
      await sendEmail({
        to: customer.email,
        subject,
        html,
        storeId: store.id,
        type: "reservation_reminder",
      });

      // 送信済みマーク（重複送信防止）
      await supabaseAdmin
        .from("reservations")
        .update({ reminder_sent_at: now.toISOString() } as any)
        .eq("id", reservation.id);

      const { data: customerWithLine } = await supabaseAdmin
        .from("customers")
        .select("line_user_id")
        .eq("email", customer.email)
        .eq("store_id", store.id)
        .single();
      const lineUserId = (customerWithLine as any)?.line_user_id;
      if (lineUserId) {
        const dateStr = new Date(reservation.reserved_at).toLocaleString("ja-JP", {
          month: "long", day: "numeric", weekday: "short",
          hour: "2-digit", minute: "2-digit",
        });
        const lineMsg = `⏰ 予約リマインダー\n明日 ${dateStr}\n${store.name}${service?.name ? `\n${service.name}` : ""}${cancelUrl ? `\n\nキャンセルはこちら:\n${cancelUrl}` : ""}`;
        await sendLineMessage({ lineUserId, message: lineMsg, storeId: store.id });
      }

      sent++;
    } catch (e) {
      console.error(`[cron] send-reminders failed for reservation ${reservation.id}:`, e);
      failed++;
    }
  }

  console.log(`[cron] send-reminders: sent=${sent}, failed=${failed}`);
  return Response.json({ sent, failed });
}
