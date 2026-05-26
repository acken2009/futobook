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

    // 送信ログ記録
    await supabaseAdmin.from("notification_log").insert({
      store_id: storeId ?? null,
      recipient_email: to,
      type,
      subject,
      status: "sent",
    });
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);

    // 失敗ログ記録
    await supabaseAdmin.from("notification_log").insert({
      store_id: storeId ?? null,
      recipient_email: to,
      type,
      subject,
      status: "failed",
      error: String(error),
    }).catch(() => {}); // ログ記録失敗は無視
  }
}
