/**
 * シンプルなインメモリレートリミッター（Vercel Edge 非対応・単一サーバー用）
 * 本番環境では Upstash Redis に切り替えることを推奨
 *
 * 切り替え方法:
 *   npm install @upstash/ratelimit @upstash/redis
 *   → lib/rate-limit-redis.ts を参照
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 古いエントリを定期的に削除（メモリリーク対策）
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  },
  60 * 1000 // 1分ごと
);

interface RateLimitOptions {
  windowMs: number; // ウィンドウ幅（ミリ秒）
  max: number;      // ウィンドウ内の最大リクエスト数
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // 新しいウィンドウ
    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: options.max - 1, resetAt };
  }

  if (entry.count >= options.max) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: options.max - entry.count, resetAt: entry.resetAt };
}

/**
 * 予約API用レートリミット（IPアドレスベース）
 * 10分間に10回まで
 */
export function reservationRateLimit(ip: string): RateLimitResult {
  return rateLimit(`reservation:${ip}`, { windowMs: 10 * 60 * 1000, max: 10 });
}

/**
 * 認証API用レートリミット（メールアドレスベース）
 * 15分間に5回まで
 */
export function authRateLimit(identifier: string): RateLimitResult {
  return rateLimit(`auth:${identifier}`, { windowMs: 15 * 60 * 1000, max: 5 });
}

/**
 * Checkout API用レートリミット（IPアドレスベース）
 * 1分間に5回まで
 */
export function checkoutRateLimit(ip: string): RateLimitResult {
  return rateLimit(`checkout:${ip}`, { windowMs: 60 * 1000, max: 5 });
}

/**
 * レートリミット超過時のレスポンスを生成
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfterSec = Math.ceil((resetAt - Date.now()) / 1000);
  return Response.json(
    { error: "リクエストが多すぎます。しばらくしてから再試行してください。" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
