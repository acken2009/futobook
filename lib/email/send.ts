import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "noreply@storeplatform.jp";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  storeId?: string;
  type?: string;
}

/**
 * メール送信（失敗してもWebhook処理は止めない）
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, html, storeId, type = "general" } = options;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);

    // 失敗ログ記録（DB障害でもWebhook処理を止めない）
    try {
      await supabaseAdmin.from("notification_log").insert({
        store_id: storeId ?? null,
        recipient_email: to,
        type,
        subject,
        status: "failed",
        error: String(error),
      });
    } catch (logErr) {
      console.error("Failed to write email failure log:", logErr);
    }
    return;
  }

  // 送信成功ログ記録（送信とは独立したtry/catch）
  try {
    await supabaseAdmin.from("notification_log").insert({
      store_id: storeId ?? null,
      recipient_email: to,
      type,
      subject,
      status: "sent",
    });
  } catch (logErr) {
    console.error("Failed to write email success log:", logErr);
  }
}
