"use client";

import { useState } from "react";
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

const FONT_OPTIONS = [
  { value: "inter", label: "Inter（デフォルト）" },
  { value: "noto-sans-jp", label: "Noto Sans JP" },
  { value: "zen-kaku-gothic-new", label: "Zen Kaku Gothic New" },
];

const COLOR_PRESETS = [
  { label: "ブラック × ゴールド", primary: "#111111", secondary: "#D4A017" },
  { label: "ネイビー × ホワイト", primary: "#1E3A5F", secondary: "#FFFFFF" },
  { label: "ブルー（デフォルト）", primary: "#3B82F6", secondary: "#1E40AF" },
  { label: "グリーン × ホワイト", primary: "#16A34A", secondary: "#FFFFFF" },
  { label: "ローズ × ゴールド", primary: "#BE185D", secondary: "#D4A017" },
  { label: "パープル × シルバー", primary: "#7C3AED", secondary: "#9CA3AF" },
  { label: "オレンジ × ブラック", primary: "#EA580C", secondary: "#111111" },
  { label: "カスタム", primary: "", secondary: "" },
];

function detectPreset(primary: string, secondary: string): string {
  const match = COLOR_PRESETS.find(
    (p) => p.primary !== "" && p.primary === primary && p.secondary === secondary
  );
  return match ? match.label : "カスタム";
}

export function CustomizationForm({ storeId, customization, initialImages = [] }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  const initialPrimary = customization?.primary_color ?? "#3B82F6";
  const initialSecondary = customization?.secondary_color ?? "#1E40AF";
  const [selectedPreset, setSelectedPreset] = useState(() =>
    detectPreset(initialPrimary, initialSecondary)
  );

  const [form, setForm] = useState({
    description: customization?.description ?? "",
    description_en: (customization as any)?.description_en ?? "",
    primary_color: initialPrimary,
    secondary_color: initialSecondary,
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
    setSaveError(null);
    setSaveWarning(null);

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

      {/* デザイン */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">デザイン</h2>
        <div className="space-y-4">
          {/* カラープリセット */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カラープリセット
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset.label);
                      if (preset.primary !== "") {
                        setForm((f) => ({
                          ...f,
                          primary_color: preset.primary,
                          secondary_color: preset.secondary,
                        }));
                        setSaved(false);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-colors text-left ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {preset.primary !== "" ? (
                      <span className="flex gap-1 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.secondary }}
                        />
                      </span>
                    ) : (
                      <span className="flex gap-1 shrink-0">
                        <span className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400" />
                      </span>
                    )}
                    <span className={isSelected ? "font-medium text-blue-700" : "text-gray-700"}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* カスタムカラー（カスタム選択時のみ表示） */}
          {selectedPreset === "カスタム" && (
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
          )}

          {/* 選択中のカラーのプレビュー（カスタム以外） */}
          {selectedPreset !== "カスタム" && (
            <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">
              <span
                className="w-6 h-6 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: form.primary_color }}
              />
              <span
                className="w-6 h-6 rounded-full border border-black/10 shrink-0"
                style={{ backgroundColor: form.secondary_color }}
              />
              <span className="font-mono text-xs">{form.primary_color}</span>
              <span className="text-gray-400">/</span>
              <span className="font-mono text-xs">{form.secondary_color}</span>
            </div>
          )}

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
  );
}
