/**
 * 店舗サイトのセクション（ブロック）定義
 *
 * - セクションの種類ごとに「編集フィールド」と「初期値」を宣言的に定義する
 * - 編集画面（フォーム自動生成）とサーバー側バリデーション（zodスキーマ自動生成）の
 *   両方がこの定義を唯一の情報源として使う
 * - ここはクライアント/サーバー両方から import されるため、サーバー専用モジュールを import しないこと
 */

export type FieldDef =
  | { key: string; label: string; kind: "text"; max?: number; placeholder?: string }
  | { key: string; label: string; kind: "textarea"; max?: number; placeholder?: string }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; kind: "toggle" }
  | { key: string; label: string; kind: "image" }
  | {
      key: string;
      label: string;
      kind: "list";
      maxItems: number;
      itemLabel: string;
      itemFields: FieldDef[];
    };

export interface SectionDef {
  type: SectionType;
  label: string;
  description: string;
  icon: string;
  fields: FieldDef[];
  defaultProps: Record<string, unknown>;
  /** 同じ種類を複数置けるか */
  allowMultiple: boolean;
}

export const SECTION_TYPES = [
  "hero",
  "concept",
  "coupon",
  "menu",
  "staff",
  "gallery",
  "plans",
  "voices",
  "news",
  "faq",
  "hours",
  "access",
  "cta",
  "sns",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

const TITLE_FIELD: FieldDef = {
  key: "title",
  label: "見出し（空欄なら標準の見出し）",
  kind: "text",
  max: 60,
};

export const SECTION_DEFS: Record<SectionType, SectionDef> = {
  hero: {
    type: "hero",
    label: "メインビジュアル",
    description: "ページ最上部。店名・キャッチコピー・予約ボタン",
    icon: "🖼️",
    allowMultiple: false,
    fields: [
      {
        key: "variant",
        label: "レイアウト",
        kind: "select",
        options: [
          { value: "cover", label: "全面写真（カバー画像を背景に）" },
          { value: "split", label: "左右分割（写真＋テキスト）" },
          { value: "simple", label: "シンプル（写真なし）" },
        ],
      },
      { key: "catchcopy", label: "キャッチコピー", kind: "text", max: 60, placeholder: "例: 髪から、毎日を心地よく。" },
      { key: "subcopy", label: "サブコピー", kind: "textarea", max: 200 },
    ],
    defaultProps: { variant: "cover", catchcopy: "", subcopy: "" },
  },
  concept: {
    type: "concept",
    label: "コンセプト",
    description: "お店のこだわりや想いを伝える文章と写真",
    icon: "💬",
    allowMultiple: true,
    fields: [
      TITLE_FIELD,
      { key: "body", label: "本文", kind: "textarea", max: 2000 },
      { key: "imageUrl", label: "写真", kind: "image" },
      {
        key: "imagePosition",
        label: "写真の位置",
        kind: "select",
        options: [
          { value: "left", label: "左" },
          { value: "right", label: "右" },
        ],
      },
    ],
    defaultProps: { title: "", body: "", imageUrl: "", imagePosition: "left" },
  },
  coupon: {
    type: "coupon",
    label: "クーポン",
    description: "初回限定・期間限定のお得なメニュー",
    icon: "🎟️",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      {
        key: "items",
        label: "クーポン",
        kind: "list",
        maxItems: 10,
        itemLabel: "クーポン",
        itemFields: [
          { key: "name", label: "クーポン名", kind: "text", max: 60, placeholder: "例: 【初回】カット＋カラー" },
          { key: "price", label: "価格・割引", kind: "text", max: 30, placeholder: "例: ¥6,600 / 20%OFF" },
          { key: "note", label: "条件・補足", kind: "text", max: 120, placeholder: "例: 新規の方限定・平日のみ" },
        ],
      },
    ],
    defaultProps: { title: "", items: [] },
  },
  menu: {
    type: "menu",
    label: "メニュー・料金",
    description: "「サービスメニュー」に登録した内容を自動表示",
    icon: "✂️",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      {
        key: "variant",
        label: "表示形式",
        kind: "select",
        options: [
          { value: "list", label: "料金表（リスト）" },
          { value: "cards", label: "カード" },
        ],
      },
      { key: "note", label: "補足（税込表記・指名料など）", kind: "text", max: 200 },
    ],
    defaultProps: { title: "", variant: "list", note: "" },
  },
  staff: {
    type: "staff",
    label: "スタッフ紹介",
    description: "スタイリストの写真・役職・紹介文",
    icon: "💇",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      {
        key: "members",
        label: "スタッフ",
        kind: "list",
        maxItems: 20,
        itemLabel: "スタッフ",
        itemFields: [
          { key: "name", label: "名前", kind: "text", max: 40 },
          { key: "role", label: "役職", kind: "text", max: 40, placeholder: "例: トップスタイリスト" },
          { key: "bio", label: "紹介文", kind: "textarea", max: 400 },
          { key: "imageUrl", label: "写真", kind: "image" },
          { key: "instagramUrl", label: "Instagram URL", kind: "text", max: 300 },
        ],
      },
    ],
    defaultProps: { title: "", members: [] },
  },
  gallery: {
    type: "gallery",
    label: "ギャラリー",
    description: "「店舗情報」で登録したギャラリー写真を表示",
    icon: "📷",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      {
        key: "columns",
        label: "列数（PC表示）",
        kind: "select",
        options: [
          { value: "3", label: "3列" },
          { value: "4", label: "4列" },
        ],
      },
    ],
    defaultProps: { title: "", columns: "3" },
  },
  plans: {
    type: "plans",
    label: "月額会員プラン",
    description: "サブスクプランを表示（スタンダードプランのみ公開）",
    icon: "🔄",
    allowMultiple: false,
    fields: [TITLE_FIELD],
    defaultProps: { title: "" },
  },
  voices: {
    type: "voices",
    label: "お客様の声",
    description: "口コミ・レビューを紹介",
    icon: "⭐",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      {
        key: "items",
        label: "お客様の声",
        kind: "list",
        maxItems: 12,
        itemLabel: "声",
        itemFields: [
          { key: "name", label: "お名前（例: 30代女性）", kind: "text", max: 40 },
          { key: "body", label: "内容", kind: "textarea", max: 400 },
        ],
      },
    ],
    defaultProps: { title: "", items: [] },
  },
  news: {
    type: "news",
    label: "お知らせ",
    description: "休業日・キャンペーンなどのお知らせ",
    icon: "📢",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      {
        key: "items",
        label: "お知らせ",
        kind: "list",
        maxItems: 20,
        itemLabel: "お知らせ",
        itemFields: [
          { key: "date", label: "日付", kind: "text", max: 20, placeholder: "例: 2026.10.01" },
          { key: "title", label: "タイトル", kind: "text", max: 80 },
          { key: "body", label: "本文", kind: "textarea", max: 600 },
        ],
      },
    ],
    defaultProps: { title: "", items: [] },
  },
  faq: {
    type: "faq",
    label: "よくある質問",
    description: "駐車場・支払い方法・キャンセルなど",
    icon: "❓",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      {
        key: "items",
        label: "質問",
        kind: "list",
        maxItems: 20,
        itemLabel: "質問",
        itemFields: [
          { key: "q", label: "質問", kind: "text", max: 120, placeholder: "例: 駐車場はありますか？" },
          { key: "a", label: "回答", kind: "textarea", max: 600 },
        ],
      },
    ],
    defaultProps: { title: "", items: [] },
  },
  hours: {
    type: "hours",
    label: "営業時間",
    description: "「営業時間・枠設定」の内容を自動表示",
    icon: "🕘",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      { key: "note", label: "補足（最終受付・定休日など）", kind: "text", max: 200 },
    ],
    defaultProps: { title: "", note: "" },
  },
  access: {
    type: "access",
    label: "アクセス",
    description: "住所・電話番号・地図・道順",
    icon: "📍",
    allowMultiple: false,
    fields: [
      TITLE_FIELD,
      { key: "directions", label: "道順（例: ○○駅 東口から徒歩3分）", kind: "textarea", max: 400 },
      { key: "showMap", label: "Googleマップを表示する", kind: "toggle" },
    ],
    defaultProps: { title: "", directions: "", showMap: true },
  },
  cta: {
    type: "cta",
    label: "予約の呼びかけ",
    description: "予約ボタン付きのバナー",
    icon: "📅",
    allowMultiple: true,
    fields: [
      { key: "title", label: "見出し", kind: "text", max: 60 },
      { key: "body", label: "本文", kind: "textarea", max: 300 },
    ],
    defaultProps: { title: "ご予約はこちらから", body: "24時間いつでもオンラインで予約できます。" },
  },
  sns: {
    type: "sns",
    label: "SNSリンク",
    description: "「店舗情報」で登録したSNS・Webサイトのリンク",
    icon: "🔗",
    allowMultiple: false,
    fields: [],
    defaultProps: {},
  },
};
