"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { StoreCustomization } from "@/types/database";
import { MediaUploader } from "./media-uploader";

interface StoreImage {
  id: string;
  url: string;
}

interface Props {
  storeId: string;
  customization: StoreCustomization | null;
  initialImages?: StoreImage[];
}

export function CustomizationForm({ storeId, customization, initialImages = [] }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  // 配色・フォント・レイアウトは「サイト作成」（/dashboard/site）で編集する
  const [form, setForm] = useState({
    description: customization?.description ?? "",
    description_en: (customization as any)?.description_en ?? "",
    address: customization?.address ?? "",
    phone: customization?.phone ?? "",
    website_url: customization?.website_url ?? "",
    instagram_url: customization?.instagram_url ?? "",
    twitter_url: customization?.twitter_url ?? "",
  });

  const [lineToken, setLineToken] = useState("");
  const [lineSecret, setLineSecret] = useState("");
  const [lineConfigured, setLineConfigured] = useState(false);
  const [lineSaving, setLineSaving] = useState(false);
  const [lineSaved, setLineSaved] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/line-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.configured) setLineConfigured(true);
      })
      .catch(() => {});
  }, []);

  async function handleLineSave(e: React.FormEvent) {
    e.preventDefault();
    setLineSaving(true);
    setLineError(null);
    try {
      const res = await fetch("/api/line-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_channel_access_token: lineToken || null,
          line_channel_secret: lineSecret || null,
        }),
      });
      if (res.ok) {
        setLineSaved(true);
        setLineConfigured(!!(lineToken || lineSecret));
        setLineToken("");
        setLineSecret("");
      } else {
        const d = await res.json();
        setLineError(d.error ?? "保存に失敗しました");
      }
    } catch {
      setLineError("ネットワークエラーが発生しました");
    } finally {
      setLineSaving(false);
    }
  }

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveWarning(null);

    // URL フィールドの簡易バリデーション（空文字はOK、入力がある場合はhttps?://で始まるか確認）
    const urlFields = [
      { key: "website_url", label: "ウェブサイト" },
      { key: "instagram_url", label: "Instagram" },
      { key: "twitter_url", label: "X (Twitter)" },
    ] as const;
    for (const { key, label } of urlFields) {
      const val = form[key];
      if (val && !/^https?:\/\/.+/.test(val)) {
        setSaveError(`${label} は https:// または http:// から始まるURLを入力してください`);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/store-customizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setSaved(true);
        if (data.warning) setSaveWarning(data.warning);
      } else {
        setSaveError(data.error ?? "保存に失敗しました");
      }
    } catch {
      setSaveError("ネットワークエラーが発生しました。接続を確認してください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* 店舗説明 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">基本情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗説明（日本語）
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="お店の魅力や特徴を入力してください"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗説明（English）
                <span className="ml-2 text-xs text-gray-400 font-normal">英語ページで表示されます</span>
              </label>
              <textarea
                value={form.description_en}
                onChange={(e) => update("description_en", e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your store in English"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="東京都渋谷区..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="03-1234-5678"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 配色・フォント・レイアウトは「サイト作成」で編集 */}
        <section className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
          配色・フォント・テンプレート・ページ構成は{" "}
          <Link href="/dashboard/site" className="font-semibold underline">サイト作成</Link>
          {" "}で編集できます。
        </section>

        {/* SNS・リンク */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">SNS・リンク</h2>
          <div className="space-y-3">
            {[
              { key: "website_url", label: "ウェブサイト", placeholder: "https://example.com" },
              { key: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/yourstore" },
              { key: "twitter_url", label: "X (Twitter)", placeholder: "https://twitter.com/yourstore" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        </section>

        {/* 画像・ギャラリー */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">画像・ギャラリー</h2>
          <MediaUploader
            storeId={storeId}
            logoUrl={(customization as any)?.logo_url}
            coverUrl={(customization as any)?.cover_image_url}
            initialImages={initialImages}
          />
        </section>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            ❌ {saveError}
          </div>
        )}
        {saveWarning && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-3 text-sm">
            ⚠️ {saveWarning}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : saved ? "✓ 保存しました" : "変更を保存"}
        </button>
      </form>

        {/* LINE通知設定（メインフォームとは別フォーム。ネストさせない） */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold">LINE通知設定</h2>
            {lineConfigured && (
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">設定済み</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            LINE公式アカウントのチャネルアクセストークンとチャネルシークレットを設定すると、予約確認・リマインダー・キャンセルをLINEで通知できます。
            Webhook URL: <code className="bg-gray-100 px-1 rounded">{`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/webhooks/line?store_id=${storeId}`}</code>
          </p>
          <form onSubmit={handleLineSave} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                チャネルアクセストークン
              </label>
              <input
                type="password"
                value={lineToken}
                onChange={(e) => { setLineToken(e.target.value); setLineSaved(false); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder={lineConfigured ? "変更する場合は新しいトークンを入力" : "チャネルアクセストークンを入力"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                チャネルシークレット
              </label>
              <input
                type="password"
                value={lineSecret}
                onChange={(e) => { setLineSecret(e.target.value); setLineSaved(false); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder={lineConfigured ? "変更する場合は新しいシークレットを入力" : "チャネルシークレットを入力"}
              />
            </div>
            {lineError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                ❌ {lineError}
              </div>
            )}
            <button
              type="submit"
              disabled={lineSaving || (!lineToken && !lineSecret)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {lineSaving ? "保存中..." : lineSaved ? "✓ 保存しました" : "LINE設定を保存"}
            </button>
          </form>
        </section>
    </div>
  );
}
