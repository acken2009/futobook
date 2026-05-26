"use client";

import { useState } from "react";

interface Props {
  status: string;
}

export function ConnectOnboarding({ status }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "エラーが発生しました");
      setLoading(false);
      return;
    }

    // Stripeのオンボーディングページへリダイレクト
    window.location.href = data.url;
  }

  if (status === "active") {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-green-700">
          Stripeアカウントが正常に連携されています。顧客からの決済を受け取れます。
        </p>
        <button
          onClick={handleConnect}
          className="text-sm text-blue-600 hover:underline whitespace-nowrap"
        >
          設定を変更
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {status === "pending" ? (
        <div className="mb-4">
          <p className="text-sm text-yellow-700 mb-3">
            オンボーディングが完了していません。手続きを続けてください。
          </p>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">連携すると以下が利用できます：</p>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>✓ 予約時のクレジットカード決済</li>
            <li>✓ サブスクリプション料金の自動受け取り</li>
            <li>✓ 売上の自動振り込み（毎週月曜日）</li>
          </ul>
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={loading}
        className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
      >
        {loading
          ? "準備中..."
          : status === "pending"
          ? "オンボーディングを続ける"
          : "Stripe連携を開始"}
      </button>
      <p className="text-xs text-gray-400 mt-2">
        Stripeの安全なページでアカウント登録を行います
      </p>
    </div>
  );
}
