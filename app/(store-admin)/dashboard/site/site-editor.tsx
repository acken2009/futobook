"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createSection,
  MAX_SECTIONS,
  THEME_FONTS,
  TONE_PALETTES,
  type SiteConfig,
  type SiteSection,
  type ThemeRadius,
  type ThemeTone,
} from "@/lib/site/config";
import { SECTION_DEFS, SECTION_TYPES, type SectionType } from "@/lib/site/sections";
import { applyTemplate, SITE_TEMPLATES, TEMPLATE_CATEGORIES, type SiteTemplate } from "@/lib/site/templates";
import { SITE_FONT_CLASS, SITE_FONT_LABELS } from "@/lib/site/fonts";
import { PREVIEW_MESSAGE, type PreviewMessage } from "@/lib/site/preview-protocol";
import { FieldEditor, IconButton } from "./field-editor";

interface Props {
  slug: string;
  initialConfig: SiteConfig;
  initialPrimary: string;
  initialSecondary: string;
  /** まだ一度もサイトを保存していない（テンプレート選択から始める） */
  isFirstTime: boolean;
}

type Tab = "template" | "sections" | "design";

/** 店舗側で編集するデータの編集先（セクションが既存データを表示する場合） */
const DATA_SOURCES: Partial<Record<SectionType, { label: string; href: string }>> = {
  menu: { label: "メニューは「サービスメニュー」で編集", href: "/dashboard/services" },
  gallery: { label: "写真は「店舗情報」で追加", href: "/dashboard/customization" },
  hours: { label: "営業時間は「営業時間・枠設定」で編集", href: "/dashboard/availability" },
  access: { label: "住所・電話番号は「店舗情報」で編集", href: "/dashboard/customization" },
  sns: { label: "SNSリンクは「店舗情報」で編集", href: "/dashboard/customization" },
  hero: { label: "ロゴ・カバー画像は「店舗情報」で変更", href: "/dashboard/customization" },
  plans: { label: "プランは「サブスクプラン」で編集", href: "/dashboard/subscriptions" },
};

const COLOR_PRESETS = [
  { label: "ブラウン × ベージュ", primary: "#8B6B4A", secondary: "#C9A97E" },
  { label: "ゴールド × ブラック", primary: "#B08D57", secondary: "#1A1A1A" },
  { label: "バーガンディ × ゴールド", primary: "#8B1E2D", secondary: "#C9A227" },
  { label: "ピンク × ミント", primary: "#E0748A", secondary: "#7EC8C8" },
  { label: "ネイビー × スカイ", primary: "#1E3A5F", secondary: "#5B9BD5" },
  { label: "ブルー × ネイビー", primary: "#3B82F6", secondary: "#1E40AF" },
  { label: "グリーン × オリーブ", primary: "#2F7D5B", secondary: "#A3B18A" },
  { label: "ブラック × グレー", primary: "#222222", secondary: "#9CA3AF" },
];

const TONE_OPTIONS: { value: ThemeTone; label: string }[] = [
  { value: "light", label: "ホワイト" },
  { value: "cream", label: "クリーム" },
  { value: "dark", label: "ダーク" },
];

const RADIUS_OPTIONS: { value: ThemeRadius; label: string; preview: string }[] = [
  { value: "square", label: "角ばった", preview: "rounded-none" },
  { value: "rounded", label: "少し丸い", preview: "rounded-lg" },
  { value: "pill", label: "まるい", preview: "rounded-full" },
];

export function SiteEditor({ slug, initialConfig, initialPrimary, initialSecondary, isFirstTime }: Props) {
  const [config, setConfig] = useState<SiteConfig>(initialConfig);
  const [primary, setPrimary] = useState(initialPrimary);
  const [secondary, setSecondary] = useState(initialSecondary);
  const [tab, setTab] = useState<Tab>(isFirstTime ? "template" : "sections");
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [device, setDevice] = useState<"pc" | "mobile">("pc");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [hasSaved, setHasSaved] = useState(!isFirstTime);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ---------- プレビュー連携 ----------
  const post = useCallback((msg: PreviewMessage) => {
    iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  const sendUpdate = useCallback(() => {
    post({ source: PREVIEW_MESSAGE, kind: "update", config, primaryColor: primary, secondaryColor: secondary });
  }, [post, config, primary, secondary]);

  useEffect(() => { sendUpdate(); }, [sendUpdate]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== iframeRef.current?.contentWindow) return;
      if ((e.data as PreviewMessage)?.source === PREVIEW_MESSAGE && e.data.kind === "ready") sendUpdate();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendUpdate]);

  // 未保存のまま離れようとしたら確認
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ---------- 編集操作 ----------
  function change(next: SiteConfig) {
    setConfig(next);
    setDirty(true);
    setMessage(null);
  }

  function updateSection(id: string, patch: Partial<SiteSection>) {
    change({ ...config, sections: config.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  function updateProp(id: string, key: string, value: unknown) {
    change({
      ...config,
      sections: config.sections.map((s) => (s.id === id ? { ...s, props: { ...s.props, [key]: value } } : s)),
    });
  }

  function moveSection(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= config.sections.length) return;
    const sections = [...config.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    change({ ...config, sections });
  }

  function removeSection(section: SiteSection) {
    if (!confirm(`「${SECTION_DEFS[section.type].label}」を削除しますか？入力した内容も削除されます。`)) return;
    change({ ...config, sections: config.sections.filter((s) => s.id !== section.id) });
  }

  function addSection(type: SectionType) {
    const section = createSection(type);
    change({ ...config, sections: [...config.sections, section] });
    setOpenSectionId(section.id);
    setTimeout(() => post({ source: PREVIEW_MESSAGE, kind: "scroll", sectionId: section.id }), 100);
  }

  function chooseTemplate(template: SiteTemplate) {
    if (template.id === config.templateId && !dirty) return;
    if (hasSaved || dirty) {
      const ok = confirm(
        `テンプレート「${template.name}」を適用しますか？\n\nデザインとセクション構成が切り替わります。入力済みの文章・スタッフ・クーポン等は引き継がれます。（保存するまで公開ページには反映されません）`
      );
      if (!ok) return;
    }
    change(applyTemplate(config, template));
    if (template.colors) {
      setPrimary(template.colors.primary);
      setSecondary(template.colors.secondary);
    }
  }

  function toggleOpen(section: SiteSection) {
    const next = openSectionId === section.id ? null : section.id;
    setOpenSectionId(next);
    if (next) post({ source: PREVIEW_MESSAGE, kind: "scroll", sectionId: next });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_config: config, primary_color: primary, secondary_color: secondary }),
      });
      const data = await res.json();
      if (res.ok) {
        setDirty(false);
        setHasSaved(true);
        setMessage({ type: "ok", text: "保存しました。公開ページに反映されています。" });
      } else {
        setMessage({ type: "error", text: data.error ?? "保存に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "ネットワークエラーが発生しました" });
    } finally {
      setSaving(false);
    }
  }

  const usedTypes = new Set(config.sections.map((s) => s.type));

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold mr-auto">サイト作成</h1>
        <div className="hidden lg:flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {(["pc", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`px-3 py-1.5 ${device === d ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              {d === "pc" ? "🖥️ PC" : "📱 スマホ"}
            </button>
          ))}
        </div>
        <Link href={`/store/${slug}`} target="_blank" className="text-sm text-blue-600 hover:underline">
          公開ページを見る ↗
        </Link>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : dirty ? "保存して公開" : "✓ 保存済み"}
        </button>
      </div>
      {message && (
        <div className={`px-4 py-2 text-sm ${message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.type === "ok" ? "✓ " : "❌ "}{message.text}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* 編集パネル */}
        <div className="w-full lg:w-[420px] shrink-0 border-r border-gray-200 bg-white flex flex-col min-h-0">
          <div className="flex border-b border-gray-200 text-sm">
            {([
              ["template", "テンプレート"],
              ["sections", "セクション"],
              ["design", "デザイン"],
            ] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 py-3 font-medium border-b-2 transition-colors ${
                  tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {tab === "template" && (
              <div className="space-y-6">
                {!hasSaved && (
                  <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    まずは業種に合うテンプレートを選びましょう。あとから文章・写真・色・セクションの並びを自由に変更できます。
                  </p>
                )}
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <div key={cat.id}>
                    <h2 className="text-sm font-semibold text-gray-500 mb-2">{cat.label}</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {SITE_TEMPLATES.filter((t) => t.category === cat.id).map((t) => (
                        <TemplateCard
                          key={t.id}
                          template={t}
                          active={config.templateId === t.id}
                          fallbackColors={{ primary, secondary }}
                          onClick={() => chooseTemplate(t)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "sections" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  クリックで内容を編集。👁 で表示/非表示、↑↓ で並べ替えできます。未入力のセクションは公開ページに表示されません。
                </p>
                {config.sections.map((section, i) => {
                  const def = SECTION_DEFS[section.type];
                  const open = openSectionId === section.id;
                  const source = DATA_SOURCES[section.type];
                  return (
                    <div key={section.id} className={`border rounded-lg ${open ? "border-blue-300 shadow-sm" : "border-gray-200"}`}>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleOpen(section)}
                          className={`flex-1 flex items-center gap-2 text-left text-sm ${section.visible ? "" : "opacity-40"}`}
                        >
                          <span>{def.icon}</span>
                          <span className="font-medium">{def.label}</span>
                          <span className="text-gray-400 text-xs ml-auto">{open ? "▲" : "▼"}</span>
                        </button>
                        <IconButton
                          label={section.visible ? "非表示にする" : "表示する"}
                          onClick={() => updateSection(section.id, { visible: !section.visible })}
                        >
                          {section.visible ? "👁" : "🚫"}
                        </IconButton>
                        <IconButton label="上へ" onClick={() => moveSection(i, -1)} disabled={i === 0}>↑</IconButton>
                        <IconButton label="下へ" onClick={() => moveSection(i, 1)} disabled={i === config.sections.length - 1}>↓</IconButton>
                        <IconButton label="削除" onClick={() => removeSection(section)} danger>✕</IconButton>
                      </div>
                      {open && (
                        <div className="border-t border-gray-100 px-3 py-4 space-y-4">
                          <p className="text-xs text-gray-500">{def.description}</p>
                          {source && (
                            <Link href={source.href} className="block text-xs text-blue-600 hover:underline">
                              {source.label} →
                            </Link>
                          )}
                          {def.fields.length > 0 && (
                            <FieldEditor
                              fields={def.fields}
                              values={section.props}
                              onChange={(key, value) => updateProp(section.id, key, value)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {config.sections.length < MAX_SECTIONS && (
                  <div className="pt-3">
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) addSection(e.target.value as SectionType); }}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white hover:border-blue-400 cursor-pointer"
                    >
                      <option value="">＋ セクションを追加...</option>
                      {SECTION_TYPES.map((type) => {
                        const def = SECTION_DEFS[type];
                        const disabled = !def.allowMultiple && usedTypes.has(type);
                        return (
                          <option key={type} value={type} disabled={disabled}>
                            {def.icon} {def.label}{disabled ? "（追加済み）" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            )}

            {tab === "design" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold mb-2">配色</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_PRESETS.map((p) => {
                      const active = p.primary === primary && p.secondary === secondary;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => { setPrimary(p.primary); setSecondary(p.secondary); setDirty(true); }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 text-xs text-left ${
                            active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="flex gap-0.5 shrink-0">
                            <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.primary }} />
                            <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.secondary }} />
                          </span>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <ColorInput label="メインカラー（ボタン等）" value={primary} onChange={(v) => { setPrimary(v); setDirty(true); }} />
                    <ColorInput label="サブカラー（差し色）" value={secondary} onChange={(v) => { setSecondary(v); setDirty(true); }} />
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold mb-2">背景</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {TONE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => change({ ...config, theme: { ...config.theme, tone: o.value } })}
                        className={`rounded-lg border-2 p-2 text-xs ${config.theme.tone === o.value ? "border-blue-500" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <span
                          className="block h-10 rounded mb-1 border border-black/10"
                          style={{ backgroundColor: TONE_PALETTES[o.value].bg }}
                        />
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold mb-2">フォント</h2>
                  <div className="space-y-2">
                    {THEME_FONTS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => change({ ...config, theme: { ...config.theme, font: f } })}
                        className={`w-full flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left ${
                          config.theme.font === f ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className={`${SITE_FONT_CLASS[f]} text-base`}>髪から、毎日を心地よく。</span>
                        <span className="text-xs text-gray-500 ml-2 shrink-0">{SITE_FONT_LABELS[f].split("（")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold mb-2">角の丸み</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {RADIUS_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => change({ ...config, theme: { ...config.theme, radius: o.value } })}
                        className={`rounded-lg border-2 p-2 text-xs ${config.theme.radius === o.value ? "border-blue-500" : "border-gray-200 hover:border-gray-300"}`}
                      >
                        <span className={`block mx-auto w-16 h-6 mb-1 ${o.preview}`} style={{ backgroundColor: primary }} />
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* プレビュー（PC幅のみ） */}
        <div className="hidden lg:flex flex-1 min-w-0 bg-gray-100 justify-center overflow-hidden p-4">
          <iframe
            ref={iframeRef}
            src="/site-preview"
            title="サイトのプレビュー"
            className="bg-white shadow-lg rounded-lg h-full transition-all duration-300"
            style={{ width: device === "pc" ? "100%" : 390 }}
          />
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template, active, fallbackColors, onClick,
}: { template: SiteTemplate; active: boolean; fallbackColors: { primary: string; secondary: string }; onClick: () => void }) {
  const colors = template.colors ?? fallbackColors;
  const palette = TONE_PALETTES[template.theme.tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 overflow-hidden transition-colors ${
        active ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* ミニプレビュー */}
      <div className="h-24 p-2.5 flex flex-col gap-1.5" style={{ backgroundColor: palette.bg, color: palette.fg }}>
        <div className="h-9 rounded-sm" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }} />
        <span className={`${SITE_FONT_CLASS[template.theme.font]} text-[11px] font-bold truncate`}>
          {template.name}
        </span>
        <div className="flex gap-1">
          <span className="h-2 flex-1 rounded-sm" style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}` }} />
          <span className="h-2 flex-1 rounded-sm" style={{ backgroundColor: palette.card, border: `1px solid ${palette.border}` }} />
          <span className="h-2 w-6 rounded-sm" style={{ backgroundColor: colors.primary }} />
        </div>
      </div>
      <div className="p-2.5 bg-white">
        <p className="text-sm font-semibold flex items-center gap-1">
          <span className="truncate">{template.name}</span>
          {active && <span className="shrink-0 whitespace-nowrap text-[10px] text-blue-600 bg-blue-50 px-1.5 rounded">適用中</span>}
        </p>
        <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{template.description}</p>
      </div>
    </button>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div>
      <span className="block text-xs text-gray-600 mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded border border-gray-300 cursor-pointer shrink-0"
        />
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
          }}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-mono"
        />
      </div>
    </div>
  );
}
