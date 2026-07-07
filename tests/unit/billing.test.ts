import { describe, it, expect } from "vitest";
import { calculatePlatformFee, calculateSubscriptionFeePercent } from "@/lib/stripe/fees";
import { tierFromPlan, PLAN_FEATURES } from "@/lib/plans/features";

// プランデータ（実際のDBと同じ構造）
const PLANS = [
  {
    id: "starter-id",
    name: "スターター",
    price: 0,
    transaction_fee_pct: 0.049,
    max_reservations_per_month: 30,
  },
  {
    id: "basic-id",
    name: "ベーシック",
    price: 2980,
    transaction_fee_pct: 0.029,
    max_reservations_per_month: null,
  },
  {
    id: "standard-id",
    name: "スタンダード",
    price: 9800,
    transaction_fee_pct: 0.019,
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

describe("プラットフォーム手数料計算 エッジケース", () => {
  it("0円の予約は手数料0円", () => {
    expect(calcPlatformFee(0, 0.05)).toBe(0);
  });

  it("1円の5%は0.05円 → 0円（Math.round）", () => {
    expect(calcPlatformFee(1, 0.05)).toBe(0);
  });

  it("10円の5%は0.5円 → 1円（Math.round: 0.5は切り上げ）", () => {
    expect(calcPlatformFee(10, 0.05)).toBe(1);
  });

  it("100万円の5%は50000円", () => {
    expect(calcPlatformFee(1_000_000, 0.05)).toBe(50_000);
  });

  it("手数料率0%のときは常に0円", () => {
    expect(calcPlatformFee(9800, 0)).toBe(0);
  });

  it("333円の3%は9.99円 → 10円（Math.round）", () => {
    expect(calcPlatformFee(333, 0.03)).toBe(10);
  });

  it("334円の3%は10.02円 → 10円（Math.round）", () => {
    expect(calcPlatformFee(334, 0.03)).toBe(10);
  });
});

describe("サブスク手数料率変換（calculateSubscriptionFeePercent）", () => {
  it("5% → 5", () => {
    expect(calculateSubscriptionFeePercent(0.05)).toBe(5);
  });

  it("3% → 3", () => {
    expect(calculateSubscriptionFeePercent(0.03)).toBe(3);
  });

  it("2% → 2", () => {
    expect(calculateSubscriptionFeePercent(0.02)).toBe(2);
  });

  it("0% → 0", () => {
    expect(calculateSubscriptionFeePercent(0)).toBe(0);
  });

  it("10% → 10", () => {
    expect(calculateSubscriptionFeePercent(0.10)).toBe(10);
  });

  it("浮動小数点誤差: 0.03 * 100 = 3.0000000000000004 → 丸めて3になる", () => {
    // JavaScript の浮動小数点: 0.03 * 100 !== 3 の場合がある
    expect(calculateSubscriptionFeePercent(0.03)).toBe(3);
  });

  it("2.5% → 2.5（Stripeは小数2桁まで対応するため丸めない）", () => {
    expect(calculateSubscriptionFeePercent(0.025)).toBe(2.5);
  });

  it("小数3桁以下は2桁に丸める: 2.567% → 2.57", () => {
    expect(calculateSubscriptionFeePercent(0.02567)).toBe(2.57);
  });
});

describe("プランの制限チェック", () => {
  it("スタータープランは月30件制限がある", () => {
    const starter = PLANS.find((p) => p.name === "スターター");
    expect(starter?.max_reservations_per_month).toBe(30);
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

describe("新料金の手数料計算（4.9 / 2.9 / 1.9%）", () => {
  it("スターター: 10000円の4.9%は490円", () => {
    expect(calcPlatformFee(10000, 0.049)).toBe(490);
  });

  it("ベーシック: 10000円の2.9%は290円", () => {
    expect(calcPlatformFee(10000, 0.029)).toBe(290);
  });

  it("スタンダード: 10000円の1.9%は190円", () => {
    expect(calcPlatformFee(10000, 0.019)).toBe(190);
  });

  it("サブスク手数料率: 0.049 → 4.9（浮動小数点誤差なし）", () => {
    expect(calculateSubscriptionFeePercent(0.049)).toBe(4.9);
  });

  it("サブスク手数料率: 0.029 → 2.9", () => {
    expect(calculateSubscriptionFeePercent(0.029)).toBe(2.9);
  });

  it("サブスク手数料率: 0.019 → 1.9", () => {
    expect(calculateSubscriptionFeePercent(0.019)).toBe(1.9);
  });
});

describe("プラン階層判定（tierFromPlan）", () => {
  it("プラン未加入（null）は free", () => {
    expect(tierFromPlan(null)).toBe("free");
    expect(tierFromPlan(undefined)).toBe("free");
  });

  it("price=0（スターター）は free", () => {
    expect(tierFromPlan({ name: "スターター", price: 0 })).toBe("free");
  });

  it("ベーシック（¥2,980）は basic", () => {
    expect(tierFromPlan({ name: "ベーシック", price: 2980 })).toBe("basic");
  });

  it("スタンダード（¥9,800）は standard", () => {
    expect(tierFromPlan({ name: "スタンダード", price: 9800 })).toBe("standard");
  });

  it("名前に「スタンダード」を含めば価格に関わらず standard", () => {
    expect(tierFromPlan({ name: "スタンダード（旧）", price: 5000 })).toBe("standard");
  });

  it("¥9,800以上の有料プランは名前が違っても standard", () => {
    expect(tierFromPlan({ name: "プロ", price: 29800 })).toBe("standard");
  });
});

describe("プラン機能フェンス定義", () => {
  it("free は LINE・物販・サブスク・カスタマイズ・分析が使えない", () => {
    const f = PLAN_FEATURES.free;
    expect(f.lineNotifications).toBe(false);
    expect(f.productSales).toBe(false);
    expect(f.customerSubscriptions).toBe(false);
    expect(f.customization).toBe(false);
    expect(f.analytics).toBe(false);
    expect(f.hideBranding).toBe(false);
  });

  it("basic は サブスク以外の全機能が使える", () => {
    const f = PLAN_FEATURES.basic;
    expect(f.lineNotifications).toBe(true);
    expect(f.productSales).toBe(true);
    expect(f.customerSubscriptions).toBe(false);
    expect(f.customization).toBe(true);
    expect(f.analytics).toBe(true);
    expect(f.hideBranding).toBe(true);
  });

  it("standard は全機能が使える", () => {
    const f = PLAN_FEATURES.standard;
    expect(Object.values(f).every(Boolean)).toBe(true);
  });

  it("上位プランは下位プランの機能をすべて含む（単調性）", () => {
    const tiers = [PLAN_FEATURES.free, PLAN_FEATURES.basic, PLAN_FEATURES.standard];
    for (let i = 1; i < tiers.length; i++) {
      for (const key of Object.keys(tiers[i - 1]) as (keyof typeof PLAN_FEATURES.free)[]) {
        if (tiers[i - 1][key]) {
          expect(tiers[i][key]).toBe(true);
        }
      }
    }
  });
});
