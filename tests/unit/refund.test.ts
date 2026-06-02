import { describe, it, expect } from "vitest";
import { calcRefundAmount, calcCancelTokenExpiry } from "@/lib/stripe/refund";

describe("calcRefundAmount", () => {
  const baseReservedAt = "2026-06-10T14:00:00.000Z";

  it("24時間以上前は全額返金", () => {
    const now = new Date("2026-06-09T13:59:00.000Z"); // 24h1min前
    const { refundAmount, refundPct } = calcRefundAmount(10000, baseReservedAt, now);
    expect(refundAmount).toBe(10000);
    expect(refundPct).toBe(100);
  });

  it("ちょうど24時間前は全額返金", () => {
    const now = new Date("2026-06-09T14:00:00.000Z"); // ちょうど24h前
    const { refundAmount, refundPct } = calcRefundAmount(10000, baseReservedAt, now);
    expect(refundAmount).toBe(10000);
    expect(refundPct).toBe(100);
  });

  it("24時間未満2時間以上前は50%返金", () => {
    const now = new Date("2026-06-10T02:00:00.000Z"); // 12h前
    const { refundAmount, refundPct } = calcRefundAmount(10000, baseReservedAt, now);
    expect(refundAmount).toBe(5000);
    expect(refundPct).toBe(50);
  });

  it("50%計算でfloor処理される", () => {
    const now = new Date("2026-06-10T02:00:00.000Z");
    const { refundAmount } = calcRefundAmount(9999, baseReservedAt, now);
    expect(refundAmount).toBe(4999);
  });

  it("金額0円は返金額も0", () => {
    const now = new Date("2026-06-09T13:00:00.000Z");
    const { refundAmount, refundPct } = calcRefundAmount(0, baseReservedAt, now);
    expect(refundAmount).toBe(0);
    expect(refundPct).toBe(100);
  });
});

describe("calcCancelTokenExpiry", () => {
  it("予約日時の2時間前を返す", () => {
    const reservedAt = "2026-06-10T14:00:00.000Z";
    const expiry = calcCancelTokenExpiry(reservedAt);
    expect(expiry.toISOString()).toBe("2026-06-10T12:00:00.000Z");
  });

  it("日をまたぐケース", () => {
    const reservedAt = "2026-06-10T01:00:00.000Z";
    const expiry = calcCancelTokenExpiry(reservedAt);
    expect(expiry.toISOString()).toBe("2026-06-09T23:00:00.000Z");
  });
});
