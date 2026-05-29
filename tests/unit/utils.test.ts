import { describe, it, expect } from "vitest";
import { formatCurrency, isValidSlug, formatDatetime } from "@/lib/utils";

describe("formatCurrency", () => {
  it("0円を正しくフォーマットする（円記号と数値を含む）", () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/0/);
    expect(result.toLowerCase()).toMatch(/[¥￥]/);
  });

  it("2980円を正しくフォーマットする（カンマ区切り）", () => {
    const result = formatCurrency(2980);
    expect(result).toContain("2,980");
  });

  it("9800円を正しくフォーマットする（カンマ区切り）", () => {
    const result = formatCurrency(9800);
    expect(result).toContain("9,800");
  });

  it("100000円を正しくフォーマットする（カンマ区切り）", () => {
    const result = formatCurrency(100000);
    expect(result).toContain("100,000");
  });
});

describe("isValidSlug", () => {
  it("有効なslugを許可する", () => {
    expect(isValidSlug("my-store")).toBe(true);
    expect(isValidSlug("store123")).toBe(true);
    expect(isValidSlug("abc")).toBe(true);
  });

  it("短すぎるslugを拒否する（2文字以下）", () => {
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("a")).toBe(false);
  });

  it("長すぎるslugを拒否する（51文字以上）", () => {
    expect(isValidSlug("a".repeat(51))).toBe(false);
  });

  it("大文字を含むslugを拒否する", () => {
    expect(isValidSlug("MyStore")).toBe(false);
  });

  it("日本語を含むslugを拒否する", () => {
    expect(isValidSlug("my-店舗")).toBe(false);
  });

  it("スペースを含むslugを拒否する", () => {
    expect(isValidSlug("my store")).toBe(false);
  });
});

describe("formatDatetime", () => {
  it("ISO日時を日本語形式でフォーマットする", () => {
    const result = formatDatetime("2026-05-29T10:00:00.000Z");
    // 日本語の日付形式を含む（年・月・日）
    expect(result).toContain("2026");
    expect(result).toContain("5");
    expect(result).toContain("29");
  });
});
