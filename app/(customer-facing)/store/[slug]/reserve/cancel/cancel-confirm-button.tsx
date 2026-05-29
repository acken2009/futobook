"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  token: string;
  storeSlug: string;
}

export default function CancelConfirmButton({ token, storeSlug }: Props) {
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number | null>(null);
  const [refundPct, setRefundPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.refundAmount > 0) {
          setRefundAmount(data.refundAmount);
          setRefundPct(data.refundPct);
        }
        setCancelled(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "キャンセルに失敗しました。時間をおいて再度お試しください。");
      }
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  if (cancelled) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-semibold text-gray-800 mb-1">キャンセルが完了しました</p>
        <p className="text-sm text-gray-500 mb-4">
          確認メールをお送りしましたのでご確認ください。
        </p>
        {refundAmount != null && refundPct != null && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5 text-sm text-green-800">
            💴 {refundPct}%返金（¥{refundAmount.toLocaleString("ja-JP")}）を処理しました。<br />
            <span className="text-green-600 text-xs">カードへの反映には数営業日かかる場合があります。</span>
          </div>
        )}
        <Link
          href={`/store/${storeSlug}`}
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
        >
          店舗ページに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 text-center">
          {error}
        </p>
      )}
      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-3 rounded-xl font-semibold transition-colors"
      >
        {loading ? "処理中..." : "この予約をキャンセルする"}
      </button>
    </div>
  );
}
