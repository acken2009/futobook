import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Vercel Cron: 5分ごとに実行
// vercel.json の crons に設定済み
export async function GET(request: NextRequest) {
  // Cronジョブの認証（CRON_SECRET で保護）
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 15分以上前に作成された pending 予約をキャンセル
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();

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
