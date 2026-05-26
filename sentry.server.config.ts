import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.2,

  // Webhook処理エラーを必ず捕捉
  beforeSend(event) {
    // Stripeの署名検証失敗は正常なリクエストなのでスキップ
    if (event.exception?.values?.[0]?.value?.includes("No signatures found")) {
      return null;
    }
    return event;
  },
});
