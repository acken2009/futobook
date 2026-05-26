import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StorePlatform - 店舗の予約・サブスク・決済プラットフォーム";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          color: "white",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            marginBottom: 24,
            letterSpacing: "-2px",
          }}
        >
          StorePlatform
        </div>
        <div
          style={{
            fontSize: 32,
            opacity: 0.9,
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          予約・サブスク・クレジット決済を
          <br />
          あなたのお店に
        </div>
        <div
          style={{
            display: "flex",
            gap: 32,
            marginTop: 60,
            fontSize: 22,
            opacity: 0.8,
          }}
        >
          <span>📅 予約管理</span>
          <span>🔄 サブスク</span>
          <span>💳 Stripe決済</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
