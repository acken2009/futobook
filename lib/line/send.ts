import { supabaseAdmin } from "@/lib/supabase/admin";

interface SendLineMessageOptions {
  lineUserId: string;
  message: string;
  storeId?: string;
}

export async function sendLineMessage(options: SendLineMessageOptions): Promise<void> {
  const { lineUserId, message, storeId } = options;

  let accessToken: string | null = null;

  if (storeId) {
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
