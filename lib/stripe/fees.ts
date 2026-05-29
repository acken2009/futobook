/**
 * プラットフォーム手数料計算（サーバー側で必ず実行）
 *
 * - DB から取得した transaction_fee_pct を使う（クライアント値は信用しない）
 * - Math.round で端数処理（0.5以上は切り上げ）
 * - 単体テストで直接インポート可能なよう Stripe SDK に依存しない
 */

/**
 * 予約・単発決済の手数料計算
 * @param amount - 決済金額（円）
 * @param feePct - 手数料率（例: 0.05 = 5%）
 * @returns application_fee_amount に渡す金額（円）
 */
export function calculatePlatformFee(amount: number, feePct: number): number {
  return Math.round(amount * feePct);
}

/**
 * サブスク決済の手数料率（Stripe の application_fee_percent 用）
 * @param feePct - 手数料率（例: 0.05 = 5%）
 * @returns application_fee_percent に渡す整数パーセント（例: 5）
 */
export function calculateSubscriptionFeePercent(feePct: number): number {
  return Math.round(feePct * 100);
}
