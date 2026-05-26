import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

/**
 * サーバーサイド Stripe クライアント
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

/**
 * クライアントサイド Stripe インスタンス（シングルトン）
 * Stripe Elements の初期化に使用
 */
let stripePromise: ReturnType<typeof loadStripe>;

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    );
  }
  return stripePromise;
}

/**
 * プラットフォーム手数料を計算する（サーバー側で必ず実行）
 * @param amount - 決済金額（円）
 * @param feePct - 手数料率（例: 0.05 = 5%）
 */
export function calculatePlatformFee(amount: number, feePct: number): number {
  return Math.round(amount * feePct);
}
