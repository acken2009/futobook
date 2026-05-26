"use client";

import { useState } from "react";

interface Props {
  storeId: string;
  primaryColor: string;
}

export function CustomerPortalButton({ storeId, primaryColor }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccess(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: storeId, customer_email: email }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "エラーが発生しました");
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <form onSubmit={handleAccess} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ご登録のメールアドレス
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="tanaka@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        style={{ backgroundColor: primaryColor }}
      >
        {loading ? "確認中..." : "サブスクリプションを管理する"}
      </button>
      <p className="text-xs text-gray-400 text-center">
        🔒 Stripe の安全なポータルへ移動します
      </p>
    </form>
  );
}
