import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 本番のみエラー送信
  enabled: process.env.NODE_ENV === "production",

  // パフォーマンス監視（20%のサンプリング）
  tracesSampleRate: 0.2,

  // セッションリプレイ（エラー時のみ）
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,   // 個人情報をマスク
      blockAllMedia: true,
    }),
  ],
});
