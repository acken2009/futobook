import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

function verifySignature(body: string, secret: string, signature: string): boolean {
  const hash = createHmac("sha256", secret).update(body).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id");
  if (!storeId) {
    return Response.json({ error: "store_id required" }, { status: 400 });
  }

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("line_channel_secret, line_channel_access_token")
    .eq("id", storeId)
    .single();

  const secret = (store as any)?.line_channel_secret;
  if (!secret) {
    return Response.json({ error: "LINE not configured" }, { status: 400 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  if (!verifySignature(body, secret, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { events?: any[] };
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  for (const event of payload.events ?? []) {
    const lineUserId: string = event.source?.userId;
    if (!lineUserId) continue;

    if (event.type === "follow") {
      // フォロー時: line_user_idをpending状態で保存（メール未リンク）
      // メッセージで「メールアドレスを送ってください」と案内
      try {
        await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(store as any)?.line_channel_access_token ?? ""}`,
          },
          body: JSON.stringify({
            replyToken: event.replyToken,
            messages: [
              {
                type: "text",
                text: "フォローありがとうございます！\n予約通知を受け取るには、ご予約時に使用したメールアドレスをこのチャットに送信してください。",
              },
            ],
          }),
        });
      } catch (e) {
        console.error("[LINE webhook] reply error:", e);
      }
    }

    if (event.type === "message" && event.message?.type === "text") {
      try {
        const text: string = event.message.text.trim();

        // メールアドレスの場合、customersテーブルのline_user_idを更新
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
          const { data: customer } = await supabaseAdmin
            .from("customers")
            .select("id, line_user_id")
            .eq("store_id", storeId)
            .eq("email", text)
            .single();

          const accessToken = (store as any)?.line_channel_access_token ?? "";

          if (customer) {
            // 既にリンク済みの場合は別ユーザーによる乗っ取りを防ぐため更新しない
            if (!(customer as any).line_user_id) {
              await supabaseAdmin
                .from("customers")
                .update({ line_user_id: lineUserId } as any)
                .eq("id", customer.id);
            }

            try {
              await fetch("https://api.line.me/v2/bot/message/reply", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: [
                    {
                      type: "text",
                      text: "連携完了しました！予約の確認・リマインダー・キャンセル通知をLINEでお知らせします。",
                    },
                  ],
                }),
              });
            } catch (e) {
              console.error("[LINE webhook] reply error:", e);
            }
          } else {
            try {
              await fetch("https://api.line.me/v2/bot/message/reply", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  replyToken: event.replyToken,
                  messages: [
                    {
                      type: "text",
                      text: "該当するお客様情報が見つかりませんでした。ご予約時のメールアドレスをご確認ください。",
                    },
                  ],
                }),
              });
            } catch (e) {
              console.error("[LINE webhook] reply error:", e);
            }
          }
        }
      } catch (e) {
        console.error("[LINE webhook] message handler error:", e);
      }
    }
  }

  return Response.json({ ok: true });
}
