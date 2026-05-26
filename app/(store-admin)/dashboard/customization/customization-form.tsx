"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StoreCustomization } from "@/types/database";

interface Props {
  storeId: string;
  customization: StoreCustomization | null;
}

const FONT_OPTIONS = [
  { value: "inter", label: "Inter（デフォルト）" },
  { value: "noto-sans-jp", label: "Noto Sans JP" },
  { value: "zen-kaku-gothic-new", label: "Zen Kaku Gothic New" },
];

export function CustomizationForm({ storeId, customization }: Props) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    description: customization?.description ?? "",
    primary_color: customization?.primary_color ?? "#3B82F6",
    secondary_color: customization?.secondary_color ?? "#1E40AF",
    font_family: customization?.font_family ?? "inter",
    address: customization?.address ?? "",
    phone: customization?.phone ?? "",
    website_url: customization?.website_url ?? "",
    instagram_url: customization?.instagram_url ?? "",
    twitter_url: customization?.twitter_url ?? "",
  });

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("store_customizations")
      .upsert({ store_id: storeId, ...form });

    if (!error) setSaved(true);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 店舗説明 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">基本情報</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              店舗説明
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="お店の魅力や特徴を入力してください"
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

      {/* デザイン */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">デザイン</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メインカラー
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => update("primary_color", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={(e) => update("primary_color", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                サブカラー
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) => update("secondary_color", e.target.value)}
                  className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.secondary_color}
                  onChange={(e) => update("secondary_color", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">フォント</label>
            <select
              value={form.font_family}
              onChange={(e) => update("font_family", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
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
                type="url"
                value={form[f.key as keyof typeof form]}
                onChange={(e) => update(f.key, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "保存中..." : saved ? "✓ 保存しました" : "変更を保存"}
      </button>
    </form>
  );
}
