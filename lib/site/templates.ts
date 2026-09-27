/**
 * 業種別サイトテンプレート
 *
 * テンプレート = 配色 + テーマ（背景トーン・フォント・角丸）+ 初期セクション構成 + 初期文言。
 * 新しい業種を増やすときは TEMPLATE_CATEGORIES と SITE_TEMPLATES に追加するだけでよい。
 *
 * 初期文言は「どの店舗が公開しても事実と食い違わない」汎用的なものに限る。
 * クーポン・スタッフ・FAQ など店舗固有の情報は空のまま（空のセクションは公開ページで自動的に非表示）。
 */
import { createSection, type SiteConfig, type SiteSection, type SiteTheme } from "./config";
import { SECTION_DEFS, type SectionType } from "./sections";

export const TEMPLATE_CATEGORIES = [
  { id: "hair", label: "美容室・理容室" },
  { id: "general", label: "汎用" },
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]["id"];

export interface SiteTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  /** null = 店舗の現在の色を維持 */
  colors: { primary: string; secondary: string } | null;
  theme: SiteTheme;
  sections: [SectionType, Record<string, unknown>?][];
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: "hair-natural",
    name: "ナチュラル",
    category: "hair",
    description: "生成り色と明朝体でやわらかく上品に。大人女性向けのサロンに",
    colors: { primary: "#8B6B4A", secondary: "#C9A97E" },
    theme: { tone: "cream", font: "mincho", radius: "rounded" },
    sections: [
      ["hero", { variant: "split", catchcopy: "髪から、毎日を心地よく。", subcopy: "一人ひとりの髪質とライフスタイルに寄り添い、扱いやすく長持ちするスタイルをご提案します。" }],
      ["concept", { body: "カウンセリングを大切に、お客様のなりたいイメージを丁寧に伺います。ご自宅でも再現しやすいスタイルづくりを心がけています。", imagePosition: "left" }],
      ["coupon"],
      ["menu", { variant: "list", note: "表示価格はすべて税込です。" }],
      ["staff"],
      ["gallery", { columns: "3" }],
      ["voices"],
      ["hours"],
      ["access", { showMap: true }],
      ["faq"],
      ["cta"],
      ["sns"],
    ],
  },
  {
    id: "hair-mode",
    name: "モード",
    category: "hair",
    description: "黒基調×ゴシックで洗練された印象に。デザインカラーやトレンド系サロンに",
    colors: { primary: "#B08D57", secondary: "#1A1A1A" },
    theme: { tone: "dark", font: "modern", radius: "square" },
    sections: [
      ["hero", { variant: "cover", catchcopy: "似合うを、更新する。", subcopy: "トレンドと骨格・髪質を掛け合わせた、あなただけのデザインを。" }],
      ["gallery", { columns: "4" }],
      ["concept", { imagePosition: "right" }],
      ["menu", { variant: "cards", note: "表示価格はすべて税込です。" }],
      ["staff"],
      ["coupon"],
      ["news"],
      ["hours"],
      ["access", { showMap: true }],
      ["cta"],
      ["sns"],
    ],
  },
  {
    id: "barber-classic",
    name: "クラシックバーバー",
    category: "hair",
    description: "ダーク×バーガンディ×ゴールドの重厚感。メンズ・理容室・バーバーに",
    colors: { primary: "#8B1E2D", secondary: "#C9A227" },
    theme: { tone: "dark", font: "mincho", radius: "square" },
    sections: [
      ["hero", { variant: "cover", catchcopy: "確かな技術で、男を上げる。", subcopy: "カット・シェービング・ヘッドスパ。くつろぎの時間とともに。" }],
      ["concept", { body: "伝統的な理容の技術と、今の時代に合うスタイルを。一人ひとりの骨格と髪質を見極め、手入れのしやすい仕上がりをお約束します。", imagePosition: "left" }],
      ["menu", { variant: "list", note: "表示価格はすべて税込です。" }],
      ["staff"],
      ["gallery", { columns: "3" }],
      ["coupon"],
      ["voices"],
      ["hours"],
      ["access", { showMap: true }],
      ["cta", { title: "ご予約はオンラインで", body: "空き状況の確認から予約まで、24時間いつでも。" }],
      ["sns"],
    ],
  },
  {
    id: "hair-fresh",
    name: "フレッシュ",
    category: "hair",
    description: "白×パステルと丸ゴシックで親しみやすく。ファミリー・キッズ向けサロンに",
    colors: { primary: "#E0748A", secondary: "#7EC8C8" },
    theme: { tone: "light", font: "rounded", radius: "pill" },
    sections: [
      ["hero", { variant: "split", catchcopy: "家族みんなで通える、まちの美容室。", subcopy: "お子さまからご年配の方まで、気軽にお越しください。" }],
      ["news"],
      ["concept", { imagePosition: "right" }],
      ["coupon"],
      ["menu", { variant: "cards", note: "表示価格はすべて税込です。" }],
      ["staff"],
      ["gallery", { columns: "3" }],
      ["faq"],
      ["hours"],
      ["access", { showMap: true }],
      ["cta"],
    ],
  },
  {
    id: "simple",
    name: "シンプル",
    category: "general",
    description: "どの業種にも合う標準デザイン（これまでの店舗ページと同じ構成）",
    colors: null,
    theme: { tone: "light", font: "gothic", radius: "rounded" },
    sections: [
      ["hero", { variant: "cover" }],
      ["access", { showMap: false }],
      ["gallery", { columns: "3" }],
      ["menu", { variant: "cards" }],
      ["plans"],
      ["sns"],
    ],
  },
];

export const DEFAULT_TEMPLATE_ID = "simple";

export function getTemplate(id: string): SiteTemplate | undefined {
  return SITE_TEMPLATES.find((t) => t.id === id);
}

export function buildConfigFromTemplate(template: SiteTemplate): SiteConfig {
  return {
    version: 1,
    templateId: template.id,
    theme: { ...template.theme },
    sections: template.sections.map(([type, props]) => createSection(type, props)),
  };
}

/** site_config 未設定の店舗に使う設定（従来の店舗ページと同じ構成） */
export function defaultSiteConfig(): SiteConfig {
  return buildConfigFromTemplate(getTemplate(DEFAULT_TEMPLATE_ID)!);
}

/**
 * レイアウト系（select）以外 = 店舗が入力した内容。
 * sample を渡すと、それと同じ値（＝テンプレートの初期文言のまま）のキーも除外する。
 */
function contentProps(section: SiteSection, sample?: Record<string, unknown>): Record<string, unknown> {
  const selectKeys = new Set(
    SECTION_DEFS[section.type].fields.filter((f) => f.kind === "select").map((f) => f.key)
  );
  return Object.fromEntries(
    Object.entries(section.props).filter(
      ([k, v]) => !selectKeys.has(k) && !(sample && JSON.stringify(sample[k]) === JSON.stringify(v))
    )
  );
}

/** テンプレートがそのセクション種別に入れている初期値 */
function templateSample(template: SiteTemplate | undefined, type: SectionType): Record<string, unknown> | undefined {
  const entry = template?.sections.find(([t]) => t === type);
  return entry ? { ...SECTION_DEFS[type].defaultProps, ...entry[1] } : undefined;
}

function isFilled(v: unknown): boolean {
  return Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : false;
}

/**
 * テンプレートを適用する。
 * - 構成・レイアウト・テーマはテンプレートのものに置き換える
 * - 同じ種類のセクションに店舗が入力した内容（文章・スタッフ・FAQ等）は引き継ぐ
 *   （前のテンプレートの初期文言のままの項目は引き継がず、新テンプレートの文言にする）
 * - テンプレートに無い種類で内容が入っているセクションは、消さずに非表示で末尾に残す
 */
export function applyTemplate(current: SiteConfig, template: SiteTemplate): SiteConfig {
  const next = buildConfigFromTemplate(template);
  const prevTemplate = getTemplate(current.templateId);
  const remaining = [...current.sections];

  const userContent = (s: SiteSection) =>
    Object.fromEntries(
      Object.entries(contentProps(s, templateSample(prevTemplate, s.type))).filter(([, v]) => isFilled(v))
    );

  next.sections = next.sections.map((section) => {
    const idx = remaining.findIndex((s) => s.type === section.type);
    if (idx === -1) return section;
    const [old] = remaining.splice(idx, 1);
    return { ...section, props: { ...section.props, ...userContent(old) } };
  });

  for (const leftover of remaining) {
    if (Object.keys(userContent(leftover)).length > 0) next.sections.push({ ...leftover, visible: false });
  }

  return next;
}
