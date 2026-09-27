import { describe, it, expect } from "vitest";
import {
  createSection,
  normalizeSiteConfig,
  pickHighlight,
  readableTextColor,
  siteConfigSchema,
  type SiteConfig,
} from "@/lib/site/config";
import { SECTION_DEFS, SECTION_TYPES } from "@/lib/site/sections";
import {
  applyTemplate,
  buildConfigFromTemplate,
  defaultSiteConfig,
  getTemplate,
  SITE_TEMPLATES,
} from "@/lib/site/templates";

describe("テンプレート定義", () => {
  it("すべてのテンプレートがスキーマ検証を通る", () => {
    for (const t of SITE_TEMPLATES) {
      const result = siteConfigSchema.safeParse(buildConfigFromTemplate(t));
      expect(result.success, t.id).toBe(true);
    }
  });

  it("テンプレートIDが重複していない", () => {
    const ids = SITE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("複数配置不可のセクションはテンプレート内で重複しない", () => {
    for (const t of SITE_TEMPLATES) {
      const types = t.sections.map(([type]) => type).filter((type) => !SECTION_DEFS[type].allowMultiple);
      expect(new Set(types).size, t.id).toBe(types.length);
    }
  });

  it("全セクション種別の初期値がスキーマ検証を通る", () => {
    for (const type of SECTION_TYPES) {
      const config: SiteConfig = { ...defaultSiteConfig(), sections: [createSection(type)] };
      expect(siteConfigSchema.safeParse(config).success, type).toBe(true);
    }
  });
});

describe("siteConfigSchema（保存時の検証）", () => {
  function withStaff(imageUrl: string, instagramUrl = "") {
    return {
      ...defaultSiteConfig(),
      sections: [createSection("staff", { members: [{ name: "山田", role: "", bio: "", imageUrl, instagramUrl }] })],
    };
  }

  it("https の画像URLは受け付ける", () => {
    expect(siteConfigSchema.safeParse(withStaff("https://x.supabase.co/a.png")).success).toBe(true);
  });

  it("javascript: や http の画像URLは拒否する", () => {
    expect(siteConfigSchema.safeParse(withStaff("javascript:alert(1)")).success).toBe(false);
    expect(siteConfigSchema.safeParse(withStaff("http://example.com/a.png")).success).toBe(false);
  });

  it("URL系テキスト欄も javascript: を拒否する", () => {
    expect(siteConfigSchema.safeParse(withStaff("", "javascript:alert(1)")).success).toBe(false);
    expect(siteConfigSchema.safeParse(withStaff("", "https://instagram.com/x")).success).toBe(true);
  });

  it("未知のプロパティは保存時に取り除く", () => {
    const config = defaultSiteConfig();
    (config.sections[0].props as any).evil = "<script>";
    const parsed = siteConfigSchema.parse(config);
    expect(parsed.sections[0].props).not.toHaveProperty("evil");
  });

  it("文字数上限を超えると拒否する", () => {
    const config = { ...defaultSiteConfig(), sections: [createSection("hero", { catchcopy: "あ".repeat(61) })] };
    expect(siteConfigSchema.safeParse(config).success).toBe(false);
  });

  it("未知のセクション種別は拒否する", () => {
    const config = { ...defaultSiteConfig(), sections: [{ id: "x1", type: "iframe", visible: true, props: {} }] };
    expect(siteConfigSchema.safeParse(config).success).toBe(false);
  });
});

describe("normalizeSiteConfig（公開ページ表示時）", () => {
  const fallback = defaultSiteConfig();

  it("未設定（null）ならフォールバックを返す", () => {
    expect(normalizeSiteConfig(null, fallback)).toBe(fallback);
  });

  it("壊れたセクションだけを捨てて残りは表示する", () => {
    const good = createSection("concept", { body: "こだわり" });
    const result = normalizeSiteConfig(
      { templateId: "hair-natural", theme: { tone: "cream" }, sections: [good, { type: "unknown" }, "garbage"] },
      fallback
    );
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].props.body).toBe("こだわり");
    expect(result.theme).toEqual({ tone: "cream", font: "gothic", radius: "rounded" });
  });
});

describe("applyTemplate（テンプレート切り替え）", () => {
  it("入力済みの内容は引き継ぎ、レイアウトはテンプレートのものにする", () => {
    const current = buildConfigFromTemplate(getTemplate("hair-natural")!);
    const staff = current.sections.find((s) => s.type === "staff")!;
    staff.props.members = [{ name: "佐藤", role: "店長", bio: "", imageUrl: "", instagramUrl: "" }];

    const next = applyTemplate(current, getTemplate("barber-classic")!);
    expect(next.templateId).toBe("barber-classic");
    expect(next.theme).toEqual(getTemplate("barber-classic")!.theme);
    expect(next.sections.find((s) => s.type === "staff")!.props.members[0].name).toBe("佐藤");
    // レイアウト（select）はテンプレートの設定になる
    expect(next.sections.find((s) => s.type === "hero")!.props.variant).toBe("cover");
  });

  it("前テンプレートの初期文言のままなら、新テンプレートの文言に置き換える", () => {
    const current = buildConfigFromTemplate(getTemplate("hair-natural")!);
    const next = applyTemplate(current, getTemplate("barber-classic")!);
    expect(next.sections.find((s) => s.type === "hero")!.props.catchcopy).toBe("確かな技術で、男を上げる。");
  });

  it("店舗が書き換えたキャッチコピーは引き継ぐ", () => {
    const current = buildConfigFromTemplate(getTemplate("hair-natural")!);
    current.sections.find((s) => s.type === "hero")!.props.catchcopy = "駅前の小さなサロン";
    const next = applyTemplate(current, getTemplate("hair-mode")!);
    expect(next.sections.find((s) => s.type === "hero")!.props.catchcopy).toBe("駅前の小さなサロン");
  });

  it("新テンプレートに無いセクションの入力内容は非表示で残す", () => {
    const current = buildConfigFromTemplate(getTemplate("hair-natural")!);
    current.sections.find((s) => s.type === "faq")!.props.items = [{ q: "駐車場は？", a: "2台あります" }];
    // hair-mode には FAQ セクションが無い
    const next = applyTemplate(current, getTemplate("hair-mode")!);
    const faq = next.sections.find((s) => s.type === "faq");
    expect(faq).toBeDefined();
    expect(faq!.visible).toBe(false);
    expect(faq!.props.items).toHaveLength(1);
  });
});

describe("配色ヘルパー", () => {
  it("暗い色には白文字、明るい色には黒文字", () => {
    expect(readableTextColor("#111111")).toBe("#ffffff");
    expect(readableTextColor("#3B82F6")).toBe("#ffffff");
    expect(readableTextColor("#F5E6A8")).toBe("#111111");
  });

  it("暗い背景では暗いメインカラーではなく明るいサブカラーを差し色にする", () => {
    expect(pickHighlight("#111111", "#8B1E2D", "#C9A227")).toBe("#C9A227");
    expect(pickHighlight("#ffffff", "#8B6B4A", "#C9A97E")).toBe("#8B6B4A");
  });
});
