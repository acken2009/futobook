/**
 * レートリミッター
 * - 本番環境（UPSTASH_REDIS_REST_URL 設定時）: Upstash Redis + Sliding Window
 * - 開発環境（未設定時）: インメモリ Map（単一プロセス用フォールバック）
 */

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

// ── インメモリ実装（ローカル開発用） ─────────────────────────────────────────

interface MemoryEntry {
  count: number;
  resetAt: number;
}
const memoryStore = new Map<string, MemoryEntry>();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetAt < now) memoryStore.delete(key);
  }
}, 60_000);

function memoryLimit(key: string, windowMs: number, max: number): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: max - 1, resetAt };
  }
  if (entry.count >= max) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return { success: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

// ── Upstash 実装（本番用） ────────────────────────────────────────────────────

type AsyncLimiter = (key: string) => Promise<RateLimitResult>;

function buildUpstashLimiter(requests: number, window: string): AsyncLimiter {
  // dynamic import で Upstash SDK を遅延ロード（インストール済みの場合のみ）
  let limiterPromise: Promise<{ limit: (key: string) => Promise<{ success: boolean; remaining: number; reset: number }> }> | null = null;

  return async (key: string): Promise<RateLimitResult> => {
    if (!limiterPromise) {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");
      const instance = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(requests, window as `${number} ${"ms" | "s" | "m" | "h" | "d"}`),
        analytics: false,
      });
      limiterPromise = Promise.resolve(instance);
    }
    const instance = await limiterPromise;
    const { success, remaining, reset } = await instance.limit(key);
    return { success, remaining, resetAt: reset };
  };
}

const useRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

const upstashReservation = useRedis ? buildUpstashLimiter(10, "10 m") : null;
const upstashCheckout    = useRedis ? buildUpstashLimiter(5,  "1 m")  : null;
const upstashAuth        = useRedis ? buildUpstashLimiter(5,  "15 m") : null;

// ── 公開 API ─────────────────────────────────────────────────────────────────

export async function reservationRateLimit(ip: string): Promise<RateLimitResult> {
  if (upstashReservation) return upstashReservation(`reservation:${ip}`);
  return memoryLimit(`reservation:${ip}`, 10 * 60_000, 10);
}

export async function checkoutRateLimit(ip: string): Promise<RateLimitResult> {
  if (upstashCheckout) return upstashCheckout(`checkout:${ip}`);
  return memoryLimit(`checkout:${ip}`, 60_000, 5);
}

export async function authRateLimit(identifier: string): Promise<RateLimitResult> {
  if (upstashAuth) return upstashAuth(`auth:${identifier}`);
  return memoryLimit(`auth:${identifier}`, 15 * 60_000, 5);
}

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
