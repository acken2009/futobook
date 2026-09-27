/**
 * 店舗サイト設定（store_customizations.site_config JSONB）の型・検証・正規化
 *
 * - スキーマは sections.ts のフィールド定義から自動生成する（定義と検証がずれない）
 * - 公開ページは normalizeSiteConfig() を通すので、壊れた/古い設定でも必ず描画できる
 * - クライアント/サーバー共用（サーバー専用モジュールを import しないこと）
 */
import { z } from "zod";
import { SECTION_DEFS, SECTION_TYPES, type FieldDef, type SectionType } from "./sections";

export const THEME_TONES = ["light", "cream", "dark"] as const;
export const THEME_FONTS = ["gothic", "mincho", "rounded", "modern"] as const;
export const THEME_RADII = ["square", "rounded", "pill"] as const;

export type ThemeTone = (typeof THEME_TONES)[number];
export type ThemeFont = (typeof THEME_FONTS)[number];
export type ThemeRadius = (typeof THEME_RADII)[number];

export interface SiteTheme {
  tone: ThemeTone;
  font: ThemeFont;
  radius: ThemeRadius;
}

export interface SiteSection {
  id: string;
  type: SectionType;
  visible: boolean;
  props: Record<string, any>;
}

export interface SiteConfig {
  version: 1;
  templateId: string;
  theme: SiteTheme;
  sections: SiteSection[];
}

export const MAX_SECTIONS = 30;

// ------------------------------------------------------------
// zod スキーマ（フィールド定義から生成）
// ------------------------------------------------------------

/** 画像URL: 空文字 or https のみ（javascript: 等を弾く） */
const imageUrlSchema = z.union([z.literal(""), z.string().max(1000).regex(/^https:\/\/[^\s"'<>]+$/)]);
/** 外部リンク: 空文字 or http(s) のみ */
const linkUrlSchema = z.union([z.literal(""), z.string().max(300).regex(/^https?:\/\/[^\s"'<>]+$/)]);

function fieldSchema(field: FieldDef): z.ZodTypeAny {
  switch (field.kind) {
    case "text":
      // URLを入れるテキスト欄は key 名で判定してリンク検証をかける
      if (field.key.toLowerCase().endsWith("url")) return linkUrlSchema.default("");
      return z.string().max(field.max ?? 200).default("");
    case "textarea":
      return z.string().max(field.max ?? 2000).default("");
    case "select": {
      const values = field.options.map((o) => o.value) as [string, ...string[]];
      return z.enum(values).default(values[0]);
    }
    case "toggle":
      return z.boolean().default(false);
    case "image":
      return imageUrlSchema.default("");
    case "list":
      return z
        .array(z.object(Object.fromEntries(field.itemFields.map((f) => [f.key, fieldSchema(f)]))))
        .max(field.maxItems)
        .default([]);
  }
}

const propsSchemas = Object.fromEntries(
  SECTION_TYPES.map((type) => [
    type,
    z.object(Object.fromEntries(SECTION_DEFS[type].fields.map((f) => [f.key, fieldSchema(f)]))),
  ])
) as Record<SectionType, z.AnyZodObject>;

const sectionSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
    type: z.enum(SECTION_TYPES),
    visible: z.boolean().default(true),
    props: z.record(z.unknown()).default({}),
  })
  .transform((s, ctx) => {
    const parsed = propsSchemas[s.type].safeParse(s.props);
    if (!parsed.success) {
      const issue = parsed.error.errors[0];
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${SECTION_DEFS[s.type].label}: ${issue.path.join(".")} ${issue.message}`,
      });
      return z.NEVER;
    }
    return { ...s, props: parsed.data } as SiteSection;
  });

export const themeSchema = z.object({
  tone: z.enum(THEME_TONES).default("light"),
  font: z.enum(THEME_FONTS).default("gothic"),
  radius: z.enum(THEME_RADII).default("rounded"),
});

export const siteConfigSchema = z.object({
  version: z.literal(1).default(1),
  templateId: z.string().max(40).default("simple"),
  theme: themeSchema.default({}),
  sections: z.array(sectionSchema).max(MAX_SECTIONS),
});

// ------------------------------------------------------------
// ヘルパー
// ------------------------------------------------------------

export function newSectionId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createSection(type: SectionType, props: Record<string, unknown> = {}): SiteSection {
  const def = SECTION_DEFS[type];
  return {
    id: newSectionId(),
    type,
    visible: true,
    props: structuredClone({ ...def.defaultProps, ...props }),
  };
}

/**
 * DBの生データ → 描画可能な SiteConfig。
 * 不正なセクションは個別に捨て、残りは描画する（1か所の不備でページ全体を壊さない）。
 * 設定が無い/全く読めない場合は fallback を返す。
 */
export function normalizeSiteConfig(raw: unknown, fallback: SiteConfig): SiteConfig {
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;

  const theme = themeSchema.safeParse(obj.theme ?? {});
  const rawSections = Array.isArray(obj.sections) ? obj.sections.slice(0, MAX_SECTIONS) : null;
  if (!rawSections) return fallback;

  const sections: SiteSection[] = [];
  for (const s of rawSections) {
    const parsed = sectionSchema.safeParse(s);
    if (parsed.success) sections.push(parsed.data);
  }

  return {
    version: 1,
    templateId: typeof obj.templateId === "string" ? obj.templateId.slice(0, 40) : fallback.templateId,
    theme: theme.success ? theme.data : fallback.theme,
    sections,
  };
}

// ------------------------------------------------------------
// テーマ → 表示用の色
// ------------------------------------------------------------

export const TONE_PALETTES: Record<ThemeTone, { bg: string; fg: string; muted: string; card: string; border: string }> = {
  light: { bg: "#ffffff", fg: "#1f2937", muted: "#6b7280", card: "#f7f7f8", border: "#e5e7eb" },
  cream: { bg: "#faf7f2", fg: "#3d3229", muted: "#85766a", card: "#ffffff", border: "#e8dfd2" },
  dark: { bg: "#111111", fg: "#f3f4f6", muted: "#a3a3a3", card: "#1c1c1c", border: "#2f2f2f" },
};

export const RADIUS_VALUES: Record<ThemeRadius, { card: string; button: string }> = {
  square: { card: "0px", button: "0px" },
  rounded: { card: "12px", button: "10px" },
  pill: { card: "20px", button: "9999px" },
};

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 背景色に対して読みやすい文字色（白 or 黒）を返す */
export function readableTextColor(hex: string): "#ffffff" | "#111111" {
  // ボタン等の太字テキスト想定: 白文字とのコントラスト比が 3 未満なら黒文字にする
  return contrastRatio(hex, "#ffffff") >= 3 ? "#ffffff" : "#111111";
}

/**
 * 見出しラベル・価格など「差し色」に使う色。
 * メイン/サブのうち背景と見分けやすい方を選ぶ（暗い背景×暗いメインカラーで沈まないように）。
 */
export function pickHighlight(bg: string, primary: string, secondary: string): string {
  return contrastRatio(primary, bg) >= 3 || contrastRatio(primary, bg) >= contrastRatio(secondary, bg)
    ? primary
    : secondary;
}
