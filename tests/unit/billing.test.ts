import { describe, it, expect } from "vitest";
import { calculatePlatformFee } from "@/lib/stripe/fees";

// プランデータ（実際のDBと同じ構造）
const PLANS = [
  {
    id: "starter-id",
    name: "スターター",
    price: 0,
    transaction_fee_pct: 0.05,
    max_reservations_per_month: 20,
  },
  {
    id: "basic-id",
    name: "ベーシック",
    price: 2980,
    transaction_fee_pct: 0.03,
    max_reservations_per_month: null,
  },
  {
    id: "standard-id",
    name: "スタンダード",
    price: 9800,
    transaction_fee_pct: 0.02,
    max_reservations_per_month: null,
  },
];

// billing/page.tsxの「現在のプラン」判定ロジック（テスト対象）
function getCurrentPlan(plans: typeof PLANS, platformPlanId: string | null) {
  return plans.find((p) => p.id === platformPlanId) ?? null;
}

// platform-plan-section.tsxのスターター判定ロジック
function isOnStarter(currentPlanId: string | null, plans: typeof PLANS) {
  const starterPlan = plans.find((p) => p.price === 0);
  return !currentPlanId || (starterPlan && currentPlanId === starterPlan.id);
}

// 手数料計算: lib/stripe/client.ts の calculatePlatformFee を直接使う（実装との乖離を防ぐ）
const calcPlatformFee = calculatePlatformFee;

describe("現在のプラン判定", () => {
  it("platform_plan_idがnullのときはnullを返す", () => {
    expect(getCurrentPlan(PLANS, null)).toBeNull();
  });

  it("スターターIDのときスタータープランを返す", () => {
    const plan = getCurrentPlan(PLANS, "starter-id");
    expect(plan?.name).toBe("スターター");
    expect(plan?.price).toBe(0);
  });

  it("ベーシックIDのときベーシックプランを返す", () => {
    const plan = getCurrentPlan(PLANS, "basic-id");
    expect(plan?.name).toBe("ベーシック");
    expect(plan?.price).toBe(2980);
  });

  it("スタンダードIDのときスタンダードプランを返す", () => {
    const plan = getCurrentPlan(PLANS, "standard-id");
    expect(plan?.name).toBe("スタンダード");
    expect(plan?.price).toBe(9800);
  });

  it("存在しないIDのときはnullを返す", () => {
    expect(getCurrentPlan(PLANS, "nonexistent-id")).toBeNull();
  });
});

describe("スタータープラン判定", () => {
  it("platform_plan_idがnullのときスターター扱い", () => {
    expect(isOnStarter(null, PLANS)).toBeTruthy();
  });

  it("スターターIDのときスターター扱い", () => {
    expect(isOnStarter("starter-id", PLANS)).toBeTruthy();
  });

  it("ベーシックIDのときスターターではない", () => {
    expect(isOnStarter("basic-id", PLANS)).toBeFalsy();
  });

  it("スタンダードIDのときスターターではない", () => {
    expect(isOnStarter("standard-id", PLANS)).toBeFalsy();
  });
});

describe("プラットフォーム手数料計算", () => {
  it("スターター: 1000円の5%は50円", () => {
    expect(calcPlatformFee(1000, 0.05)).toBe(50);
  });

  it("ベーシック: 1000円の3%は30円", () => {
    expect(calcPlatformFee(1000, 0.03)).toBe(30);
  });

  it("スタンダード: 1000円の2%は20円", () => {
    expect(calcPlatformFee(1000, 0.02)).toBe(20);
  });

  it("スターター: 10000円の5%は500円", () => {
    expect(calcPlatformFee(10000, 0.05)).toBe(500);
  });

  it("ベーシック: 10000円の3%は300円", () => {
    expect(calcPlatformFee(10000, 0.03)).toBe(300);
  });

  it("スタンダード: 10000円の2%は200円", () => {
    expect(calcPlatformFee(10000, 0.02)).toBe(200);
  });

  it("端数切り上げ: 1017円の3%は30.51円 → 31円（Math.round）", () => {
    // Math.floor なら30円、Math.round なら31円
    expect(calcPlatformFee(1017, 0.03)).toBe(31);
  });

  it("端数切り捨て: 1016円の3%は30.48円 → 30円（Math.round）", () => {
    expect(calcPlatformFee(1016, 0.03)).toBe(30);
  });
});

describe("プランの制限チェック", () => {
  it("スタータープランは月20件制限がある", () => {
    const starter = PLANS.find((p) => p.name === "スターター");
    expect(starter?.max_reservations_per_month).toBe(20);
  });

  it("ベーシックプランは予約件数無制限", () => {
    const basic = PLANS.find((p) => p.name === "ベーシック");
    expect(basic?.max_reservations_per_month).toBeNull();
  });

  it("スタンダードプランは予約件数無制限", () => {
    const standard = PLANS.find((p) => p.name === "スタンダード");
    expect(standard?.max_reservations_per_month).toBeNull();
  });

  it("プランは価格順に並んでいる", () => {
    const prices = PLANS.map((p) => p.price);
    expect(prices).toEqual([0, 2980, 9800]);
  });
});
