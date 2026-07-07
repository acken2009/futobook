import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { sendLineMessage } from "@/lib/line/send";
import { reservationReminderEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

// Vercel Cron: 1日1回（Hobbyプランの実行頻度上限）
// 予約の12〜36時間前の範囲を対象にリマインダーメールを送信
//
// 24時間ぴったりの検知窓だと1日1回実行では取りこぼしうるため、
// 24時間幅の窓（+12h〜+36h）を使う。毎日同じ時刻に実行すれば
// 窓が隙間なく連続するため、reminder_sent_at による重複防止と合わせて
// 全ての確定予約に一度だけリマインダーが届く
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();

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

      // メール送信成功後に即マーク（LINE失敗でも再送しない）
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
          timeZone: "Asia/Tokyo",
        });
        const lineMsg = `⏰ 予約リマインダー\n明日 ${dateStr}\n${store.name}${service?.name ? `\n${service.name}` : ""}${cancelUrl ? `\n\nキャンセルはこちら:\n${cancelUrl}` : ""}`;
        try {
          await sendLineMessage({ lineUserId, message: lineMsg, storeId: store.id });
        } catch (lineErr) {
          console.error(`[cron] send-reminders LINE failed for reservation ${reservation.id}:`, lineErr);
        }
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
