/**
 * Resend + React Email テンプレート
 * シンプルなHTML文字列ベースの実装（React Email パッケージなしでも動作）
 */

export interface ReservationEmailData {
  customerName: string;
  storeName: string;
  reservedAt: string; // ISO datetime
  serviceName?: string;
  partySize: number;
  storeSlug: string;
  cancelUrl?: string; // キャンセルリンク（トークン付きURL）
}

export interface SubscriptionEmailData {
  customerName: string;
  storeName: string;
  planName: string;
  price: number;
  interval: "month" | "year";
  nextBillingDate: string;
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com";

function escapeHtml(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// href属性用: javascript:スキームを防ぐ
function safeUrl(url: string | undefined): string {
  if (!url) return "#";
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return "#";
}

function baseTemplate(content: string, title: string, lang: "ja" | "en" = "ja"): string {
  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #3B82F6; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px;">Futobook</h1>
    </div>
    <div style="padding: 32px;">
      ${content}
    </div>
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        ${lang === "en"
          ? "This is an automated email. Please do not reply."
          : "このメールは自動送信されています。返信はお受けできません。"}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function reservationConfirmationEmail(
  data: ReservationEmailData,
  lang: "ja" | "en" = "ja"
): { subject: string; html: string } {
  const isEn = lang === "en";
  const locale = isEn ? "en-US" : "ja-JP";
  const date = new Date(data.reservedAt).toLocaleString(locale, {
    year: "numeric", month: "long", day: "numeric",
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });

  const eName = escapeHtml(data.customerName);
  const eStore = escapeHtml(data.storeName);
  const eService = escapeHtml(data.serviceName);
  const eSlug = encodeURIComponent(data.storeSlug);
  const safeCancelUrl = safeUrl(data.cancelUrl);

  const t = {
    heading: isEn ? "Booking Confirmation" : "ご予約の確認",
    greeting: isEn ? `Dear ${eName}, thank you for your booking.` : `${eName} 様、ご予約ありがとうございます。`,
    store: isEn ? "Store" : "店舗",
    dateTime: isEn ? "Date & Time" : "日時",
    service: isEn ? "Service" : "サービス",
    guests: isEn ? "Guests" : "人数",
    guestsVal: isEn ? `${data.partySize} guest${data.partySize > 1 ? "s" : ""}` : `${data.partySize}名`,
    cancelHeading: isEn ? "Cancellation Policy" : "キャンセルについて",
    cancelNote: isEn ? "You can cancel up to 2 hours before your booking." : "予約日時の2時間前までキャンセル可能です。",
    cancelBtn: isEn ? "Cancel My Booking" : "予約をキャンセルする",
    noCancel: isEn ? "To change or cancel your booking, please contact the store directly." : "ご予約の変更・キャンセルは、お電話または店舗ページよりお問い合わせください。",
    viewStore: isEn ? "View Store Page" : "店舗ページを見る",
    subject: isEn ? `[Booking Confirmed] ${data.storeName} - ${date}` : `【予約確認】${data.storeName} - ${date}`,
  };

  const html = baseTemplate(
    `
    <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px;">${t.heading}</h2>
    <p style="color: #6b7280; margin: 0 0 24px;">${t.greeting}</p>
    <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 40%;">${t.store}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${eStore}</td></tr>
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.dateTime}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${date}</td></tr>
        ${eService ? `<tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.service}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${eService}</td></tr>` : ""}
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.guests}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${t.guestsVal}</td></tr>
      </table>
    </div>
    ${data.cancelUrl ? `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #991b1b; font-size: 13px; margin: 0 0 8px; font-weight: 600;">${t.cancelHeading}</p>
      <p style="color: #7f1d1d; font-size: 13px; margin: 0 0 12px;">${t.cancelNote}</p>
      <a href="${safeCancelUrl}" style="display: inline-block; background: white; color: #dc2626; border: 1px solid #dc2626; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">${t.cancelBtn}</a>
    </div>` : `<p style="color: #374151; font-size: 14px; margin-bottom: 24px;">${t.noCancel}</p>`}
    <a href="${appUrl}/store/${eSlug}${isEn ? "?lang=en" : ""}" style="display: block; text-align: center; background: #3B82F6; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">${t.viewStore}</a>
    `,
    t.subject,
    lang
  );

  return { subject: t.subject, html };
}

export interface ReservationNotificationData {
  ownerName?: string;
  storeName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  reservedAt: string;
  serviceName?: string;
  partySize: number;
  notes?: string;
  dashboardUrl: string;
}

export function reservationNotificationEmail(data: ReservationNotificationData): {
  subject: string;
  html: string;
} {
  const date = new Date(data.reservedAt).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const eStore = escapeHtml(data.storeName);
  const eService = escapeHtml(data.serviceName);
  const safeDashboardUrl = safeUrl(data.dashboardUrl);

  const html = baseTemplate(
    `
    <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px;">新しい予約が入りました</h2>
    <p style="color: #6b7280; margin: 0 0 24px;">以下の内容で予約が確定しました。</p>

    <div style="background: #fff7ed; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="font-size: 12px; color: #9a3412; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">予約内容</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 40%;">日時</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${date}</td>
        </tr>
        ${eService ? `<tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">サービス</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${eService}</td>
        </tr>` : ""}
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">人数</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${data.partySize}名</td>
        </tr>
        ${data.notes ? `<tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">備考</td>
          <td style="font-size: 14px; padding: 4px 0;">${escapeHtml(data.notes)}</td>
        </tr>` : ""}
      </table>
    </div>

    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="font-size: 12px; color: #374151; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">お客様情報</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 40%;">お名前</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${escapeHtml(data.customerName)} 様</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">メール</td>
          <td style="font-size: 14px; padding: 4px 0;"><a href="mailto:${escapeHtml(data.customerEmail)}" style="color: #3B82F6;">${escapeHtml(data.customerEmail)}</a></td>
        </tr>
        ${data.customerPhone ? `<tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">電話</td>
          <td style="font-size: 14px; padding: 4px 0;"><a href="tel:${escapeHtml(data.customerPhone)}" style="color: #3B82F6;">${escapeHtml(data.customerPhone)}</a></td>
        </tr>` : ""}
      </table>
    </div>

    <a href="${safeDashboardUrl}"
       style="display: block; text-align: center; background: #3B82F6; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      ダッシュボードで確認する
    </a>
    `,
    `【新規予約】${data.storeName}`
  );

  return {
    subject: `【新規予約】${data.storeName} - ${date} ${data.customerName}様`,
    html,
  };
}

export interface ReservationCancellationEmailData {
  customerName: string;
  storeName: string;
  reservedAt: string;
  serviceName?: string;
  partySize: number;
  storeSlug: string;
  refundAmount?: number; // 返金額（円）
  refundPct?: number;    // 返金率（%）
}

export function reservationCancellationEmail(
  data: ReservationCancellationEmailData,
  lang: "ja" | "en" = "ja"
): { subject: string; html: string } {
  const isEn = lang === "en";
  const locale = isEn ? "en-US" : "ja-JP";
  const date = new Date(data.reservedAt).toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const eName = escapeHtml(data.customerName);
  const eStore = escapeHtml(data.storeName);
  const eService = escapeHtml(data.serviceName);
  const eSlug = encodeURIComponent(data.storeSlug);
  // refundPct > 0 の場合のみ返金情報を表示（0は返金なしと同じ扱い）
  const hasRefund = data.refundAmount != null && data.refundPct != null && data.refundPct > 0;

  const t = {
    heading: isEn ? "Booking Cancellation Confirmed" : "ご予約のキャンセル完了",
    greeting: isEn ? `Your booking at ${eStore} has been cancelled.` : `${eName} 様のご予約をキャンセルしました。`,
    store: isEn ? "Store" : "店舗",
    dateTime: isEn ? "Date & Time" : "日時",
    service: isEn ? "Service" : "サービス",
    guests: isEn ? "Guests" : "人数",
    guestsVal: isEn ? `${data.partySize} guest${data.partySize > 1 ? "s" : ""}` : `${data.partySize}名`,
    refundTitle: isEn ? "💳 Refund Information" : "💴 返金について",
    refundNote: isEn
      ? `A ${data.refundPct}% refund (¥${data.refundAmount?.toLocaleString()}) has been processed via Stripe. Please allow a few business days for it to appear on your card.`
      : `${data.refundPct}%返金（¥${data.refundAmount?.toLocaleString("ja-JP")}）をStripeを通じて処理しました。カードへの反映には数営業日かかる場合があります。`,
    noRefund: isEn ? "We look forward to welcoming you again." : "またのご利用をお待ちしております。",
    bookAgain: isEn ? "Book Again" : "再度予約する",
    subject: isEn ? `[Cancellation] ${data.storeName} - ${date}` : `【キャンセル完了】${data.storeName} - ${date}`,
  };

  const html = baseTemplate(
    `
    <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px;">${t.heading}</h2>
    <p style="color: #6b7280; margin: 0 0 24px;">${t.greeting}</p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 40%;">${t.store}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${eStore}</td></tr>
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.dateTime}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${date}</td></tr>
        ${eService ? `<tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.service}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${eService}</td></tr>` : ""}
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.guests}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${t.guestsVal}</td></tr>
      </table>
    </div>
    ${hasRefund ? `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #166534; font-size: 14px; font-weight: 600; margin: 0 0 4px;">${t.refundTitle}</p>
      <p style="color: #15803d; font-size: 14px; margin: 0;">${t.refundNote}</p>
    </div>` : `<p style="color: #374151; font-size: 14px; margin-bottom: 24px;">${t.noRefund}</p>`}
    <a href="${appUrl}/store/${eSlug}${isEn ? "?lang=en" : ""}" style="display: block; text-align: center; background: #3B82F6; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">${t.bookAgain}</a>
    `,
    t.subject,
    lang
  );

  return { subject: t.subject, html };
}

export interface ReservationRescheduleEmailData {
  customerName: string;
  storeName: string;
  oldReservedAt: string;
  newReservedAt: string;
  serviceName?: string;
  partySize: number;
  storeSlug: string;
  cancelUrl?: string;
}

export function reservationRescheduleEmail(
  data: ReservationRescheduleEmailData,
  lang: "ja" | "en" = "ja"
): { subject: string; html: string } {
  const isEn = lang === "en";
  const locale = isEn ? "en-US" : "ja-JP";
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric", month: "long", day: "numeric",
    weekday: "short", hour: "2-digit", minute: "2-digit",
  };
  const oldDate = new Date(data.oldReservedAt).toLocaleString(locale, opts);
  const newDate = new Date(data.newReservedAt).toLocaleString(locale, opts);

  const eName = escapeHtml(data.customerName);
  const eStore = escapeHtml(data.storeName);
  const eService = escapeHtml(data.serviceName);
  const eSlug = encodeURIComponent(data.storeSlug);
  const safeCancelUrl = safeUrl(data.cancelUrl);

  const t = {
    heading: isEn ? "Booking Rescheduled" : "ご予約日時の変更",
    greeting: isEn
      ? `Dear ${eName}, your booking at ${eStore} has been rescheduled.`
      : `${eName} 様、ご予約の日時が変更されました。`,
    before: isEn ? "Previous Date & Time" : "変更前",
    after: isEn ? "New Date & Time" : "変更後",
    service: isEn ? "Service" : "サービス",
    guests: isEn ? "Guests" : "人数",
    guestsVal: isEn ? `${data.partySize} guest${data.partySize > 1 ? "s" : ""}` : `${data.partySize}名`,
    cancelNote: isEn ? "If you need to cancel, you can do so up to 2 hours before your new booking." : "変更後の日時の2時間前までキャンセルが可能です。",
    cancelBtn: isEn ? "Cancel My Booking" : "予約をキャンセルする",
    viewStore: isEn ? "View Store Page" : "店舗ページを見る",
    subject: isEn ? `[Rescheduled] ${data.storeName} - ${newDate}` : `【日時変更】${data.storeName} - ${newDate}`,
  };

  const html = baseTemplate(
    `
    <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px;">${t.heading}</h2>
    <p style="color: #6b7280; margin: 0 0 24px;">${t.greeting}</p>
    <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="font-size: 12px; color: #92400e; font-weight: 600; margin: 0 0 4px;">${t.before}</p>
      <p style="color: #78350f; font-size: 14px; margin: 0; text-decoration: line-through;">${oldDate}</p>
    </div>
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <p style="font-size: 12px; color: #1e40af; font-weight: 600; margin: 0 0 4px;">${t.after}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #6b7280; font-size: 14px; padding: 2px 0; width: 40%;"></td><td style="font-weight: 700; font-size: 16px; padding: 2px 0; color: #1d4ed8;">${newDate}</td></tr>
        ${eService ? `<tr><td style="color: #6b7280; font-size: 14px; padding: 2px 0;">${t.service}</td><td style="font-size: 14px; padding: 2px 0;">${eService}</td></tr>` : ""}
        <tr><td style="color: #6b7280; font-size: 14px; padding: 2px 0;">${t.guests}</td><td style="font-size: 14px; padding: 2px 0;">${t.guestsVal}</td></tr>
      </table>
    </div>
    ${data.cancelUrl ? `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #7f1d1d; font-size: 13px; margin: 0 0 12px;">${t.cancelNote}</p>
      <a href="${safeCancelUrl}" style="display: inline-block; background: white; color: #dc2626; border: 1px solid #dc2626; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">${t.cancelBtn}</a>
    </div>` : ""}
    <a href="${appUrl}/store/${eSlug}${isEn ? "?lang=en" : ""}" style="display: block; text-align: center; background: #3B82F6; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">${t.viewStore}</a>
    `,
    t.subject,
    lang
  );

  return { subject: t.subject, html };
}

export interface ReservationReminderEmailData {
  customerName: string;
  storeName: string;
  reservedAt: string;
  serviceName?: string;
  partySize: number;
  storeSlug: string;
  cancelUrl?: string;
}

export function reservationReminderEmail(
  data: ReservationReminderEmailData,
  lang: "ja" | "en" = "ja"
): { subject: string; html: string } {
  const isEn = lang === "en";
  const locale = isEn ? "en-US" : "ja-JP";
  const date = new Date(data.reservedAt).toLocaleString(locale, {
    year: "numeric", month: "long", day: "numeric",
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });

  const eName = escapeHtml(data.customerName);
  const eStore = escapeHtml(data.storeName);
  const eService = escapeHtml(data.serviceName);
  const eSlug = encodeURIComponent(data.storeSlug);
  const safeCancelUrl = safeUrl(data.cancelUrl);

  const t = {
    heading: isEn ? "Booking Reminder" : "予約リマインダー",
    greeting: isEn
      ? `Dear ${eName}, your booking at ${eStore} is tomorrow.`
      : `${eName} 様、明日のご予約をお知らせします。`,
    store: isEn ? "Store" : "店舗",
    dateTime: isEn ? "Date & Time" : "日時",
    service: isEn ? "Service" : "サービス",
    guests: isEn ? "Guests" : "人数",
    guestsVal: isEn ? `${data.partySize} guest${data.partySize > 1 ? "s" : ""}` : `${data.partySize}名`,
    cancelNote: isEn ? "Need to cancel? You can cancel up to 2 hours before your booking." : "キャンセルをご希望の場合は予約日時の2時間前まで手続きが可能です。",
    cancelBtn: isEn ? "Cancel My Booking" : "予約をキャンセルする",
    viewStore: isEn ? "View Store Page" : "店舗ページを見る",
    subject: isEn ? `[Reminder] ${data.storeName} - Tomorrow ${date}` : `【リマインダー】${data.storeName} - 明日 ${date}`,
  };

  const html = baseTemplate(
    `
    <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px;">${t.heading}</h2>
    <p style="color: #6b7280; margin: 0 0 24px;">${t.greeting}</p>
    <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 40%;">${t.store}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${eStore}</td></tr>
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.dateTime}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${date}</td></tr>
        ${eService ? `<tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.service}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${eService}</td></tr>` : ""}
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.guests}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${t.guestsVal}</td></tr>
      </table>
    </div>
    ${data.cancelUrl ? `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #7f1d1d; font-size: 13px; margin: 0 0 12px;">${t.cancelNote}</p>
      <a href="${safeCancelUrl}" style="display: inline-block; background: white; color: #dc2626; border: 1px solid #dc2626; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600;">${t.cancelBtn}</a>
    </div>` : ""}
    <a href="${appUrl}/store/${eSlug}${isEn ? "?lang=en" : ""}" style="display: block; text-align: center; background: #3B82F6; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">${t.viewStore}</a>
    `,
    t.subject,
    lang
  );

  return { subject: t.subject, html };
}

export function subscriptionConfirmationEmail(
  data: SubscriptionEmailData,
  lang: "ja" | "en" = "ja"
): { subject: string; html: string } {
  const isEn = lang === "en";
  const price = new Intl.NumberFormat(isEn ? "en-US" : "ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(data.price);

  const eName = escapeHtml(data.customerName);
  const eStore = escapeHtml(data.storeName);
  const ePlan = escapeHtml(data.planName);

  const t = {
    heading: isEn ? "Subscription Confirmed" : "サブスクリプション加入完了",
    greeting: isEn ? `Dear ${eName}, thank you for subscribing!` : `${eName} 様、ご加入ありがとうございます！`,
    store: isEn ? "Store" : "店舗",
    plan: isEn ? "Plan" : "プラン",
    billing: isEn ? "Billing" : "料金",
    billingVal: `${price}/${data.interval === "month" ? (isEn ? "mo" : "月") : (isEn ? "yr" : "年")}`,
    nextBilling: isEn ? "Next Billing Date" : "次回更新日",
    note: isEn
      ? "You can cancel your subscription at any time. Contact the store if you have any questions."
      : "サブスクリプションはいつでもキャンセルできます。ご不明な点は店舗までお問い合わせください。",
    subject: isEn ? `[Subscription] ${data.storeName} - ${data.planName}` : `【加入完了】${data.storeName} - ${data.planName}`,
  };

  const html = baseTemplate(
    `
    <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px;">${t.heading}</h2>
    <p style="color: #6b7280; margin: 0 0 24px;">${t.greeting}</p>
    <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 40%;">${t.store}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${eStore}</td></tr>
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.plan}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${ePlan}</td></tr>
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.billing}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${t.billingVal}</td></tr>
        <tr><td style="color: #6b7280; font-size: 14px; padding: 4px 0;">${t.nextBilling}</td><td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${escapeHtml(data.nextBillingDate)}</td></tr>
      </table>
    </div>
    <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">${t.note}</p>
    `,
    t.subject,
    lang
  );

  return { subject: t.subject, html };
}
