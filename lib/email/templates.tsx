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

function baseTemplate(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #3B82F6; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 20px;">StorePlatform</h1>
    </div>
    <div style="padding: 32px;">
      ${content}
    </div>
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        このメールは自動送信されています。返信はお受けできません。
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function reservationConfirmationEmail(data: ReservationEmailData): {
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

  const html = baseTemplate(
    `
    <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px;">ご予約の確認</h2>
    <p style="color: #6b7280; margin: 0 0 24px;">${data.customerName} 様、ご予約ありがとうございます。</p>

    <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 40%;">店舗</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${data.storeName}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">日時</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${date}</td>
        </tr>
        ${
          data.serviceName
            ? `<tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">サービス</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${data.serviceName}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">人数</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${data.partySize}名</td>
        </tr>
      </table>
    </div>

    <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
      ご予約の変更・キャンセルは、お電話または店舗ページよりお問い合わせください。
    </p>

    <a href="${appUrl}/store/${data.storeSlug}"
       style="display: block; text-align: center; background: #3B82F6; color: white; padding: 12px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      店舗ページを見る
    </a>
    `,
    `【予約確認】${data.storeName}`
  );

  return {
    subject: `【予約確認】${data.storeName} - ${date}`,
    html,
  };
}

export function subscriptionConfirmationEmail(data: SubscriptionEmailData): {
  subject: string;
  html: string;
} {
  const price = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(data.price);

  const html = baseTemplate(
    `
    <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px;">サブスクリプション加入完了</h2>
    <p style="color: #6b7280; margin: 0 0 24px;">${data.customerName} 様、ご加入ありがとうございます！</p>

    <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0; width: 40%;">店舗</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${data.storeName}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">プラン</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${data.planName}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">料金</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${price}/${data.interval === "month" ? "月" : "年"}</td>
        </tr>
        <tr>
          <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">次回更新日</td>
          <td style="font-weight: 600; font-size: 14px; padding: 4px 0;">${data.nextBillingDate}</td>
        </tr>
      </table>
    </div>

    <p style="color: #374151; font-size: 14px; margin-bottom: 24px;">
      サブスクリプションはいつでもキャンセルできます。ご不明な点は店舗までお問い合わせください。
    </p>
    `,
    `【加入完了】${data.storeName} - ${data.planName}`
  );

  return {
    subject: `【加入完了】${data.storeName} - ${data.planName}`,
    html,
  };
}
