import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Vercel Cron: 1日1回（Hobbyプランの実行頻度上限）
// vercel.json の crons に設定済み
//
// 決済されなかった予約の主な後始末は checkout.session.expired Webhook
// （app/api/webhooks/stripe-connect/route.ts）が即時に行う。
// このCronはWebhook配信漏れ・Stripe側の一時障害に備えたバックアップ。
export async function GET(request: NextRequest) {
  // Cronジョブの認証（CRON_SECRET で保護）
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 35分以上前に作成された pending 予約をキャンセル
  // （Stripe Checkoutセッションは30分で失効するため、決済中の予約を誤って取り消さない）
  const cutoff = new Date(Date.now() - 35 * 60 * 1000).toISOString();

  const { data: expired, error } = await supabaseAdmin
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .select("id, store_id");

  if (error) {
    console.error("[cron] cancel-pending-reservations error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  console.log(`[cron] cancelled ${expired?.length ?? 0} pending reservations`);
  return Response.json({ cancelled: expired?.length ?? 0 });
}
