import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

/**
 * サーバーサイド Stripe クライアント
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
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

// 手数料計算は fees.ts に分離（Stripe SDK 非依存 → 単体テスト可能）
export { calculatePlatformFee, calculateSubscriptionFeePercent } from "./fees";
