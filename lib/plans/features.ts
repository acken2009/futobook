/**
 * プラットフォームプランの機能フェンス定義
 *
 * - プラン階層（free/basic/standard）と、階層ごとに使える機能を一元管理する
 * - 判定はサーバー側（APIルート・サーバーコンポーネント）で必ず行う
 * - tierFromPlan は純粋関数（単体テスト可能）
 */
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PlanTier = "free" | "basic" | "standard";

export interface PlanFeatures {
  /** LINE通知（設定・送信） */
  lineNotifications: boolean;
  /** 物販（商品登録・ショップ公開・商品決済） */
  productSales: boolean;
  /** 顧客向け月額会員（サブスクプラン販売） */
  customerSubscriptions: boolean;
  /** ブランドカスタマイズ（色・ロゴ・ギャラリー） */
  customization: boolean;
  /** 売上分析ダッシュボード */
  analytics: boolean;
  /** 店舗ページの「Powered by futobook」を非表示にできる */
  hideBranding: boolean;
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    lineNotifications: false,
    productSales: false,
    customerSubscriptions: false,
    customization: false,
    analytics: false,
    hideBranding: false,
  },
  basic: {
    lineNotifications: true,
    productSales: true,
    customerSubscriptions: false,
    customization: true,
    analytics: true,
    hideBranding: true,
  },
  standard: {
    lineNotifications: true,
    productSales: true,
    customerSubscriptions: true,
    customization: true,
    analytics: true,
    hideBranding: true,
  },
};

/** アップグレード案内メッセージ（機能名 → 必要プラン） */
export const UPGRADE_MESSAGES: Record<keyof PlanFeatures, string> = {
  lineNotifications: "LINE通知はベーシックプラン以上でご利用いただけます",
  productSales: "物販機能はベーシックプラン以上でご利用いただけます",
  customerSubscriptions: "月額会員（サブスク販売）はスタンダードプランでご利用いただけます",
  customization: "ブランドカスタマイズはベーシックプラン以上でご利用いただけます",
  analytics: "売上分析はベーシックプラン以上でご利用いただけます",
  hideBranding: "ブランディング非表示はベーシックプラン以上でご利用いただけます",
};

/**
 * プラン行（platform_subscription_plans）から階層を判定する。
 * price=0 → free、名前に「スタンダード」を含む or ¥9,800以上 → standard、それ以外の有料 → basic
 */
export function tierFromPlan(
  plan: { name?: string | null; price?: number | null } | null | undefined
): PlanTier {
  if (!plan || !plan.price || plan.price <= 0) return "free";
  if (plan.name?.includes("スタンダード")) return "standard";
  return plan.price >= 9800 ? "standard" : "basic";
}

/** 店舗IDからプラン階層を取得する（プラン未加入 = free） */
export async function getStoreTier(storeId: string): Promise<PlanTier> {
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("platform_plan_id")
    .eq("id", storeId)
    .single();

  if (!store?.platform_plan_id) return "free";

  // stores.platform_plan_id にはFKが無いため別クエリで取得する
  const { data: plan } = await supabaseAdmin
    .from("platform_subscription_plans")
    .select("name, price")
    .eq("id", store.platform_plan_id)
    .single();

  return tierFromPlan(plan);
}

/** 店舗IDから利用可能な機能一覧を取得する */
export async function getStoreFeatures(storeId: string): Promise<PlanFeatures> {
  return PLAN_FEATURES[await getStoreTier(storeId)];
}

/**
 * 機能ガード: 使えなければ apiError 用のメッセージを返し、使えれば null を返す
 */
export async function checkFeature(
  storeId: string,
  feature: keyof PlanFeatures
): Promise<string | null> {
  const features = await getStoreFeatures(storeId);
  return features[feature] ? null : UPGRADE_MESSAGES[feature];
}
