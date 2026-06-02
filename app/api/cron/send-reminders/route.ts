import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { reservationReminderEmail } from "@/lib/email/templates";

// Vercel Cron: 毎時0分に実行
// 予約の24時間前（±30分ウィンドウ）にリマインダーメールを送信
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // 23.5h〜24.5h 後の予約を対象（1時間ウィンドウ＝毎時実行で重複なし）
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
    .lte("reserved_at", windowEnd);

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
      sent++;
    } catch (e) {
      console.error(`[cron] send-reminders failed for reservation ${reservation.id}:`, e);
      failed++;
    }
  }

  console.log(`[cron] send-reminders: sent=${sent}, failed=${failed}`);
  return Response.json({ sent, failed });
}
