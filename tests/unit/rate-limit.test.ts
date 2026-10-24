import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Upstash が落ちている状況を再現する（limit() が例外を投げる）
const limitMock = vi.fn();
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow() { return {}; }
    limit = limitMock;
  }
  return { Ratelimit };
});
vi.mock("@upstash/redis", () => ({ Redis: class {} }));

describe("rate-limit（Upstash 障害時のフォールバック）", () => {
  beforeEach(() => {
    vi.resetModules();
    limitMock.mockReset();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("Upstash が正常なら Upstash の判定を返す", async () => {
    limitMock.mockResolvedValue({ success: false, remaining: 0, reset: 123 });
    const { reservationRateLimit } = await import("@/lib/rate-limit");
    expect(await reservationRateLimit("1.1.1.1")).toEqual({ success: false, remaining: 0, resetAt: 123 });
  });

  it("Upstash が例外を投げても予約を止めない（インメモリにフォールバック）", async () => {
    limitMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const { reservationRateLimit, checkoutRateLimit } = await import("@/lib/rate-limit");
    await expect(reservationRateLimit("2.2.2.2")).resolves.toMatchObject({ success: true });
    await expect(checkoutRateLimit("2.2.2.2")).resolves.toMatchObject({ success: true });
  });

  it("フォールバック中もインメモリの上限は効く", async () => {
    limitMock.mockRejectedValue(new Error("unauthorized"));
    const { checkoutRateLimit } = await import("@/lib/rate-limit");
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await checkoutRateLimit("3.3.3.3")).success);
    // checkout は 1分5回まで
    expect(results).toEqual([true, true, true, true, true, false]);
  });
});
