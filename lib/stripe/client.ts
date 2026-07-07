import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

/**
 * サーバーサイド Stripe クライアント
 *
 * 遅延初期化: モジュール読み込み時ではなく最初の利用時に生成する。
 * これにより環境変数が無い環境（CIのビルド等）でも import 自体は失敗しない。
 */
let _stripe: Stripe | null = null;

function getStripeServer(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Stripe client requires STRIPE_SECRET_KEY");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeServer();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
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
