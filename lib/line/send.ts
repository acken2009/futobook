import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStoreFeatures } from "@/lib/plans/features";

interface SendLineMessageOptions {
  lineUserId: string;
  message: string;
  storeId?: string;
}

export async function sendLineMessage(options: SendLineMessageOptions): Promise<void> {
  const { lineUserId, message, storeId } = options;

  let accessToken: string | null = null;

  if (storeId) {
    // プラン機能フェンス: フリープランはLINE通知を送らない（設定が残っていても停止）
    const features = await getStoreFeatures(storeId);
    if (!features.lineNotifications) return;

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("line_channel_access_token")
      .eq("id", storeId)
      .single();
    accessToken = (store as any)?.line_channel_access_token ?? null;
  }

  if (!accessToken) return;

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`LINE push failed (${res.status}):`, err);
    }
  } catch (error) {
    console.error("LINE push error:", error);
  }
}
