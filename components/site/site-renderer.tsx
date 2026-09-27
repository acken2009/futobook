/**
 * 店舗サイトの描画（公開ページ・編集画面プレビュー共用）
 *
 * フック・サーバー専用APIを使わないこと（サーバーコンポーネントからも
 * クライアントのプレビューからも同じコンポーネントで描画するため）。
 * ユーザー入力はすべて React のテキストとして描画する（HTMLとして解釈しない）。
 */
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  pickHighlight,
  RADIUS_VALUES,
  readableTextColor,
  TONE_PALETTES,
  type SiteConfig,
  type SiteSection,
} from "@/lib/site/config";
import { SECTION_DEFS, type SectionType } from "@/lib/site/sections";
import { SITE_FONT_CLASS } from "@/lib/site/fonts";

export interface SiteData {
  slug: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  description: string;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  services: { id: string; name: string; description: string | null; price: number | null; duration_minutes: number | null }[];
  images: { id: string; url: string; alt_text: string | null }[];
  plans: { id: string; name: string; description: string | null; price: number; interval: string; features: string[] }[];
  hours: { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[];
  showShop: boolean;
  hideBranding: boolean;
  isEn: boolean;
}

interface Props {
  config: SiteConfig;
  data: SiteData;
  /** 編集プレビュー: 内容が空で公開時に非表示になるセクションを案内枠で表示する */
  editing?: boolean;
}

const DEFAULT_TITLES: Record<SectionType, { ja: string; en: string; eyebrow: string }> = {
  hero: { ja: "", en: "", eyebrow: "" },
  concept: { ja: "コンセプト", en: "Concept", eyebrow: "CONCEPT" },
  coupon: { ja: "クーポン", en: "Coupons", eyebrow: "COUPON" },
  menu: { ja: "メニュー・料金", en: "Menu", eyebrow: "MENU" },
  staff: { ja: "スタッフ紹介", en: "Staff", eyebrow: "STAFF" },
  gallery: { ja: "ギャラリー", en: "Gallery", eyebrow: "GALLERY" },
  plans: { ja: "月額会員プラン", en: "Membership", eyebrow: "MEMBERSHIP" },
  voices: { ja: "お客様の声", en: "Reviews", eyebrow: "VOICE" },
  news: { ja: "お知らせ", en: "News", eyebrow: "NEWS" },
  faq: { ja: "よくある質問", en: "FAQ", eyebrow: "FAQ" },
  hours: { ja: "営業時間", en: "Hours", eyebrow: "HOURS" },
  access: { ja: "アクセス", en: "Access", eyebrow: "ACCESS" },
  cta: { ja: "", en: "", eyebrow: "RESERVE" },
  sns: { ja: "", en: "", eyebrow: "" },
};

/** 写真が無いときの背景: メインカラー → 少し暗いメインカラー */
const BRAND_GRADIENT =
  "linear-gradient(135deg, var(--c-primary) 0%, color-mix(in srgb, var(--c-primary) 65%, #000) 100%)";

const DAY_LABELS = {
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

function labels(isEn: boolean) {
  return {
    reserve: isEn ? "Book Now" : "予約する",
    subscribe: isEn ? "Membership" : "月額会員",
    shop: isEn ? "Shop" : "ショップ",
    address: isEn ? "Address" : "住所",
    phone: isEn ? "Phone" : "電話番号",
    free: isEn ? "Free" : "無料",
    min: isEn ? "min" : "分",
    perMonth: isEn ? "/mo" : "/月",
    perYear: isEn ? "/yr" : "/年",
    join: isEn ? "Join" : "加入する",
    closed: isEn ? "Closed" : "定休日",
    website: isEn ? "Website" : "ウェブサイト",
    otherLang: isEn ? "日本語" : "English",
  };
}

/** 内容が空で公開ページに出ないセクションか */
export function isSectionEmpty(section: SiteSection, data: SiteData): boolean {
  const p = section.props;
  switch (section.type) {
    case "hero":
    case "cta":
      return false;
    case "concept":
      return !p.body?.trim() && !p.imageUrl;
    case "coupon":
      return !(p.items ?? []).some((i: any) => i.name?.trim());
    case "menu":
      return data.services.length === 0;
    case "staff":
      return !(p.members ?? []).some((m: any) => m.name?.trim());
    case "gallery":
      return data.images.length === 0;
    case "plans":
      return data.plans.length === 0;
    case "voices":
      return !(p.items ?? []).some((i: any) => i.body?.trim());
    case "news":
      return !(p.items ?? []).some((i: any) => i.title?.trim());
    case "faq":
      return !(p.items ?? []).some((i: any) => i.q?.trim() && i.a?.trim());
    case "hours":
      return data.hours.length === 0 && !p.note?.trim();
    case "access":
      return !data.address && !data.phone && !p.directions?.trim();
    case "sns":
      return !data.websiteUrl && !data.instagramUrl && !data.twitterUrl;
  }
}

const EMPTY_HINTS: Partial<Record<SectionType, string>> = {
  menu: "「サービスメニュー」でメニューを登録すると表示されます",
  gallery: "「店舗情報」でギャラリー写真を追加すると表示されます",
  plans: "サブスクプランを作成すると表示されます（スタンダードプランのみ公開）",
  hours: "「営業時間・枠設定」を登録すると表示されます",
  access: "「店舗情報」で住所・電話番号を登録するか、道順を入力すると表示されます",
  sns: "「店舗情報」でSNSリンクを登録すると表示されます",
};

export function SiteRenderer({ config, data, editing = false }: Props) {
  const palette = TONE_PALETTES[config.theme.tone];
  const radius = RADIUS_VALUES[config.theme.radius];
  const primary = data.primaryColor;
  const secondary = data.secondaryColor;

  const style = {
    "--c-bg": palette.bg,
    "--c-fg": palette.fg,
    "--c-muted": palette.muted,
    "--c-card": palette.card,
    "--c-border": palette.border,
    "--c-primary": primary,
    "--c-on-primary": readableTextColor(primary),
    "--c-secondary": secondary,
    "--c-hl": pickHighlight(palette.bg, primary, secondary),
    "--r-card": radius.card,
    "--r-btn": radius.button,
  } as CSSProperties;

  const t = labels(data.isEn);
  const langQuery = data.isEn ? "?lang=en" : "";
  const toggleHref = `/store/${data.slug}${data.isEn ? "" : "?lang=en"}`;
  const reserveHref = `/store/${data.slug}/reserve${langQuery}`;

  const visible = config.sections.filter((s) => s.visible);

  return (
    <div
      className={`${SITE_FONT_CLASS[config.theme.font]} min-h-screen bg-[var(--c-bg)] text-[var(--c-fg)]`}
      style={style}
    >
      {/* 固定ヘッダー */}
      <div className="sticky top-0 z-30 border-b border-[var(--c-border)] bg-[color-mix(in_srgb,var(--c-bg)_90%,transparent)] backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href={`/store/${data.slug}${langQuery}`} className="flex items-center gap-2 min-w-0">
            {data.logoUrl && (
              <span className="relative w-8 h-8 shrink-0 overflow-hidden rounded-[var(--r-btn)]">
                <Image src={data.logoUrl} alt="" fill className="object-cover" unoptimized />
              </span>
            )}
            <span className="font-bold truncate">{data.name}</span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={toggleHref} className="text-xs text-[var(--c-muted)] hover:text-[var(--c-fg)] px-2 py-1">
              🌐 {t.otherLang}
            </Link>
            <Link
              href={reserveHref}
              className="text-sm font-semibold px-4 py-2 rounded-[var(--r-btn)] bg-[var(--c-primary)] text-[var(--c-on-primary)] hover:opacity-90 transition-opacity"
            >
              {t.reserve}
            </Link>
          </div>
        </div>
      </div>

      {visible.map((section) => {
        const empty = isSectionEmpty(section, data);
        if (empty && !editing) return null;
        return (
          <div key={section.id} id={`section-${section.id}`} data-section-id={section.id}>
            {empty ? (
              <EmptyPlaceholder section={section} />
            ) : (
              <SectionView section={section} data={data} t={t} reserveHref={reserveHref} />
            )}
          </div>
        );
      })}

      <footer className="border-t border-[var(--c-border)] py-8 text-center text-xs text-[var(--c-muted)] space-y-2">
        <p>© {data.name}</p>
        {!data.hideBranding && (
          <a href={process.env.NEXT_PUBLIC_APP_URL ?? "/"} className="hover:underline">
            Powered by <span className="font-semibold">futobook</span> — 無料で予約ページを作成
          </a>
        )}
      </footer>
    </div>
  );
}

function EmptyPlaceholder({ section }: { section: SiteSection }) {
  const def = SECTION_DEFS[section.type];
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="border-2 border-dashed border-[var(--c-border)] rounded-[var(--r-card)] px-4 py-6 text-center text-sm text-[var(--c-muted)]">
        <p className="font-semibold mb-1">
          {def.icon} {def.label}（未入力のため公開ページには表示されません）
        </p>
        <p className="text-xs">{EMPTY_HINTS[section.type] ?? "左の編集パネルで内容を入力すると表示されます"}</p>
      </div>
    </div>
  );
}

type Labels = ReturnType<typeof labels>;

function SectionView({ section, data, t, reserveHref }: { section: SiteSection; data: SiteData; t: Labels; reserveHref: string }) {
  const p = section.props;
  const titles = DEFAULT_TITLES[section.type];
  const title = p.title?.trim() || (data.isEn ? titles.en : titles.ja);
  const heading = <SectionHeading eyebrow={titles.eyebrow} title={title} />;

  switch (section.type) {
    case "hero":
      return <Hero section={section} data={data} t={t} reserveHref={reserveHref} />;

    case "concept": {
      const imageLeft = p.imagePosition !== "right";
      return (
        <Wrap>
          {heading}
          {p.imageUrl ? (
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className={`relative aspect-[4/3] overflow-hidden rounded-[var(--r-card)] ${imageLeft ? "" : "md:order-2"}`}>
                <Image src={p.imageUrl} alt="" fill className="object-cover" unoptimized />
              </div>
              <p className="leading-loose whitespace-pre-line">{p.body}</p>
            </div>
          ) : (
            <p className="max-w-2xl mx-auto text-center leading-loose whitespace-pre-line">{p.body}</p>
          )}
        </Wrap>
      );
    }

    case "coupon":
      return (
        <Wrap>
          {heading}
          {/* 件数が少なくても中央に揃える */}
          <div className="flex flex-wrap justify-center gap-4">
            {(p.items as any[]).filter((i) => i.name?.trim()).map((item, i) => (
              <div key={i} className="w-full sm:w-[calc(50%-8px)] border-2 border-dashed border-[var(--c-hl)] rounded-[var(--r-card)] p-5 bg-[var(--c-card)]">
                <p className="font-bold">{item.name}</p>
                {item.price && <p className="text-2xl font-bold text-[var(--c-hl)] mt-1">{item.price}</p>}
                {item.note && <p className="text-xs text-[var(--c-muted)] mt-2">{item.note}</p>}
              </div>
            ))}
          </div>
          <ReserveButton href={reserveHref} label={t.reserve} />
        </Wrap>
      );

    case "menu":
      return (
        <Wrap>
          {heading}
          {p.variant === "cards" ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.services.map((s) => (
                <div key={s.id} className="border border-[var(--c-border)] bg-[var(--c-card)] rounded-[var(--r-card)] p-5">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    <span className="text-lg font-bold text-[var(--c-hl)] shrink-0">{s.price ? formatCurrency(s.price) : t.free}</span>
                  </div>
                  {s.description && <p className="text-sm text-[var(--c-muted)] mb-1 whitespace-pre-line">{s.description}</p>}
                  {s.duration_minutes && <p className="text-xs text-[var(--c-muted)]">{s.duration_minutes}{t.min}</p>}
                </div>
              ))}
            </div>
          ) : (
            <ul className="max-w-3xl mx-auto divide-y divide-[var(--c-border)] border-y border-[var(--c-border)]">
              {data.services.map((s) => (
                <li key={s.id} className="py-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-semibold">{s.name}</span>
                    <span className="flex-1 border-b border-dotted border-[var(--c-border)] translate-y-[-4px]" />
                    <span className="font-bold text-[var(--c-hl)] shrink-0">{s.price ? formatCurrency(s.price) : t.free}</span>
                  </div>
                  {(s.description || s.duration_minutes) && (
                    <p className="text-sm text-[var(--c-muted)] mt-1 whitespace-pre-line">
                      {s.description}
                      {s.duration_minutes ? `${s.description ? " / " : ""}${s.duration_minutes}${t.min}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {p.note && <p className="text-xs text-[var(--c-muted)] text-center mt-4">{p.note}</p>}
          <ReserveButton href={reserveHref} label={t.reserve} />
        </Wrap>
      );

    case "staff":
      return (
        <Wrap>
          {heading}
          <div className="flex flex-wrap justify-center gap-6">
            {(p.members as any[]).filter((m) => m.name?.trim()).map((m, i) => (
              <div key={i} className="w-[calc(50%-12px)] md:w-[calc(33.333%-16px)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--r-card)] bg-[var(--c-card)] mb-3">
                  {m.imageUrl ? (
                    <Image src={m.imageUrl} alt={m.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl text-[var(--c-muted)]">👤</div>
                  )}
                </div>
                {m.role && <p className="text-xs text-[var(--c-hl)] font-semibold tracking-wide">{m.role}</p>}
                <p className="font-bold text-lg">{m.name}</p>
                {m.bio && <p className="text-sm text-[var(--c-muted)] mt-1 whitespace-pre-line">{m.bio}</p>}
                {m.instagramUrl && (
                  <a href={m.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs mt-2 text-[var(--c-muted)] hover:underline">
                    📸 Instagram
                  </a>
                )}
              </div>
            ))}
          </div>
        </Wrap>
      );

    case "gallery":
      return (
        <Wrap>
          {heading}
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${p.columns === "4" ? "md:grid-cols-4" : ""} gap-2 sm:gap-3`}>
            {data.images.map((img) => (
              <div key={img.id} className="relative aspect-square overflow-hidden rounded-[var(--r-card)] bg-[var(--c-card)]">
                <Image src={img.url} alt={img.alt_text ?? ""} fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        </Wrap>
      );

    case "plans":
      return (
        <Wrap>
          {heading}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.plans.map((plan) => (
              <div key={plan.id} className="border border-[var(--c-border)] bg-[var(--c-card)] rounded-[var(--r-card)] p-6 flex flex-col">
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                {plan.description && <p className="text-sm text-[var(--c-muted)] mb-3">{plan.description}</p>}
                <div className="mb-4">
                  <span className="text-3xl font-bold text-[var(--c-hl)]">{formatCurrency(plan.price)}</span>
                  <span className="text-[var(--c-muted)] text-sm">{plan.interval === "month" ? t.perMonth : t.perYear}</span>
                </div>
                {plan.features.length > 0 && (
                  <ul className="space-y-1 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-[var(--c-hl)]">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/store/${data.slug}/subscribe?plan=${plan.id}${data.isEn ? "&lang=en" : ""}`}
                  className="block text-center py-2 rounded-[var(--r-btn)] bg-[var(--c-primary)] text-[var(--c-on-primary)] text-sm font-semibold hover:opacity-90 transition-opacity mt-auto"
                >
                  {t.join}
                </Link>
              </div>
            ))}
          </div>
        </Wrap>
      );

    case "voices":
      return (
        <Wrap>
          {heading}
          <div className="grid md:grid-cols-2 gap-4">
            {(p.items as any[]).filter((i) => i.body?.trim()).map((item, i) => (
              <figure key={i} className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-[var(--r-card)] p-6">
                <span className="text-3xl leading-none text-[var(--c-hl)]">“</span>
                <blockquote className="text-sm leading-relaxed whitespace-pre-line -mt-2">{item.body}</blockquote>
                {item.name && <figcaption className="text-xs text-[var(--c-muted)] mt-3 text-right">— {item.name}</figcaption>}
              </figure>
            ))}
          </div>
        </Wrap>
      );

    case "news":
      return (
        <Wrap>
          {heading}
          <ul className="max-w-3xl mx-auto divide-y divide-[var(--c-border)] border-y border-[var(--c-border)]">
            {(p.items as any[]).filter((i) => i.title?.trim()).map((item, i) => (
              <li key={i} className="py-4 sm:flex gap-6">
                {item.date && <time className="text-sm text-[var(--c-muted)] shrink-0 sm:w-28">{item.date}</time>}
                <div>
                  <p className="font-semibold">{item.title}</p>
                  {item.body && <p className="text-sm text-[var(--c-muted)] mt-1 whitespace-pre-line">{item.body}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Wrap>
      );

    case "faq":
      return (
        <Wrap>
          {heading}
          <div className="max-w-3xl mx-auto space-y-3">
            {(p.items as any[]).filter((i) => i.q?.trim() && i.a?.trim()).map((item, i) => (
              <details key={i} className="group bg-[var(--c-card)] border border-[var(--c-border)] rounded-[var(--r-card)] px-5 py-4">
                <summary className="font-semibold cursor-pointer list-none flex justify-between gap-4">
                  <span><span className="text-[var(--c-hl)] mr-2">Q.</span>{item.q}</span>
                  <span className="text-[var(--c-muted)] group-open:rotate-45 transition-transform">＋</span>
                </summary>
                <p className="text-sm text-[var(--c-muted)] mt-3 whitespace-pre-line">
                  <span className="text-[var(--c-hl)] font-semibold mr-2">A.</span>{item.a}
                </p>
              </details>
            ))}
          </div>
        </Wrap>
      );

    case "hours": {
      const days = data.isEn ? DAY_LABELS.en : DAY_LABELS.ja;
      // 月曜始まりで表示
      const order = [1, 2, 3, 4, 5, 6, 0];
      const byDay = new Map(data.hours.map((h) => [h.day_of_week, h]));
      return (
        <Wrap>
          {heading}
          {data.hours.length > 0 && (
            <table className="max-w-md mx-auto w-full text-sm">
              <tbody className="divide-y divide-[var(--c-border)]">
                {order.map((d) => {
                  const h = byDay.get(d);
                  return (
                    <tr key={d}>
                      <th className="py-2.5 text-left font-semibold w-20">{days[d]}</th>
                      <td className="py-2.5 text-right">
                        {!h || h.is_closed ? (
                          <span className="text-[var(--c-muted)]">{t.closed}</span>
                        ) : (
                          `${h.open_time.slice(0, 5)} – ${h.close_time.slice(0, 5)}`
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {p.note && <p className="text-sm text-[var(--c-muted)] text-center mt-4 whitespace-pre-line">{p.note}</p>}
        </Wrap>
      );
    }

    case "access":
      return (
        <Wrap>
          {heading}
          <div className={`grid gap-8 ${p.showMap && data.address ? "md:grid-cols-2" : "max-w-xl mx-auto"}`}>
            <div className="space-y-4 text-sm">
              <dl className="space-y-4">
                {data.address && (
                  <div>
                    <dt className="text-[var(--c-muted)] text-xs">{t.address}</dt>
                    <dd className="font-medium mt-0.5">{data.address}</dd>
                  </div>
                )}
                {data.phone && (
                  <div>
                    <dt className="text-[var(--c-muted)] text-xs">{t.phone}</dt>
                    <dd className="font-medium mt-0.5">
                      <a href={`tel:${data.phone}`} className="hover:underline">{data.phone}</a>
                    </dd>
                  </div>
                )}
              </dl>
              {p.directions && <p className="whitespace-pre-line leading-relaxed">{p.directions}</p>}
            </div>
            {p.showMap && data.address && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--r-card)] border border-[var(--c-border)]">
                <iframe
                  title="map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(data.address)}&z=16&output=embed`}
                  className="absolute inset-0 w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        </Wrap>
      );

    case "cta":
      return (
        <section
          className="py-16 px-4 text-center"
          style={{ background: BRAND_GRADIENT, color: "var(--c-on-primary)" }}
        >
          {p.title && <h2 className="text-2xl md:text-3xl font-bold mb-3">{p.title}</h2>}
          {p.body && <p className="opacity-90 mb-6 whitespace-pre-line">{p.body}</p>}
          <Link
            href={reserveHref}
            className="inline-block px-10 py-3 rounded-[var(--r-btn)] font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "var(--c-on-primary)", color: "var(--c-primary)" }}
          >
            {t.reserve}
          </Link>
        </section>
      );

    case "sns":
      return (
        <div className="py-8 px-4 flex gap-6 justify-center text-sm">
          {data.websiteUrl && <SnsLink href={data.websiteUrl}>🌐 {t.website}</SnsLink>}
          {data.instagramUrl && <SnsLink href={data.instagramUrl}>📸 Instagram</SnsLink>}
          {data.twitterUrl && <SnsLink href={data.twitterUrl}>𝕏 X</SnsLink>}
        </div>
      );
  }
}

function Hero({ section, data, t, reserveHref }: { section: SiteSection; data: SiteData; t: Labels; reserveHref: string }) {
  const p = section.props;
  const sub = p.subcopy?.trim() || data.description;
  const image = data.coverUrl ?? data.images[0]?.url ?? null;

  const buttons = (inverse: boolean) => (
    <div className={`flex flex-wrap gap-3 ${p.variant === "split" ? "" : "justify-center"}`}>
      <Link
        href={reserveHref}
        className={`px-8 py-3 rounded-[var(--r-btn)] font-semibold hover:opacity-90 transition-opacity ${
          // 写真/グラデーション背景の上ではメインカラーが埋もれるので白ボタンにする
          inverse ? "bg-white text-gray-900" : "bg-[var(--c-primary)] text-[var(--c-on-primary)]"
        }`}
      >
        {t.reserve}
      </Link>
      {data.plans.length > 0 && (
        <Link
          href={`/store/${data.slug}/subscribe${data.isEn ? "?lang=en" : ""}`}
          className={`px-6 py-3 rounded-[var(--r-btn)] font-semibold border transition-colors ${inverse ? "border-white/70 text-white hover:bg-white/10" : "border-[var(--c-border)] hover:bg-[var(--c-card)]"}`}
        >
          {t.subscribe}
        </Link>
      )}
      {data.showShop && (
        <Link
          href={`/store/${data.slug}/shop`}
          className={`px-6 py-3 rounded-[var(--r-btn)] font-semibold border transition-colors ${inverse ? "border-white/70 text-white hover:bg-white/10" : "border-[var(--c-border)] hover:bg-[var(--c-card)]"}`}
        >
          🛍️ {t.shop}
        </Link>
      )}
    </div>
  );

  if (p.variant === "split") {
    return (
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-5 md:order-1 order-2">
          <p className="text-sm tracking-widest text-[var(--c-hl)] font-semibold">{data.name}</p>
          <h1 className="text-3xl md:text-4xl font-bold leading-snug">{p.catchcopy?.trim() || data.name}</h1>
          {sub && <p className="text-[var(--c-muted)] leading-relaxed whitespace-pre-line">{sub}</p>}
          {buttons(false)}
        </div>
        {/* スマホでは横長に。写真が無いときはスマホでは色ブロックを出さない */}
        <div className={`relative aspect-[4/3] md:aspect-[4/5] md:order-2 order-1 overflow-hidden rounded-[var(--r-card)] ${image ? "" : "hidden md:block"}`}>
          {image ? (
            <Image src={image} alt="" fill className="object-cover" unoptimized priority />
          ) : (
            <div className="absolute inset-0" style={{ background: BRAND_GRADIENT }} />
          )}
        </div>
      </section>
    );
  }

  if (p.variant === "simple") {
    return (
      <section className="px-4 py-16 md:py-24 text-center border-b border-[var(--c-border)]">
        <div className="max-w-2xl mx-auto space-y-5">
          {data.logoUrl && (
            <div className="relative w-20 h-20 mx-auto overflow-hidden rounded-[var(--r-card)]">
              <Image src={data.logoUrl} alt="logo" fill className="object-cover" unoptimized />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold">{data.name}</h1>
          {p.catchcopy && <p className="text-xl text-[var(--c-hl)] font-semibold">{p.catchcopy}</p>}
          {sub && <p className="text-[var(--c-muted)] leading-relaxed whitespace-pre-line">{sub}</p>}
          {buttons(false)}
        </div>
      </section>
    );
  }

  // cover（既定）
  return (
    <section className="relative px-4 py-24 md:py-36 text-white text-center overflow-hidden">
      {data.coverUrl ? (
        <>
          <Image src={data.coverUrl} alt="" fill className="object-cover" unoptimized priority />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ background: BRAND_GRADIENT }} />
          {/* 明るいメインカラーでも白文字が読めるように少し暗くする */}
          <div className="absolute inset-0 bg-black/20" />
        </>
      )}
      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-4">
        {data.logoUrl && (
          <div className="relative w-20 h-20 overflow-hidden rounded-[var(--r-card)] border-2 border-white/40 shadow-lg">
            <Image src={data.logoUrl} alt="logo" fill className="object-cover" unoptimized />
          </div>
        )}
        {p.catchcopy ? (
          <>
            <p className="text-sm tracking-widest opacity-90">{data.name}</p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">{p.catchcopy}</h1>
          </>
        ) : (
          <h1 className="text-4xl md:text-5xl font-bold">{data.name}</h1>
        )}
        {sub && <p className="text-base md:text-lg opacity-90 max-w-xl whitespace-pre-line">{sub}</p>}
        <div className="mt-2">{buttons(true)}</div>
      </div>
    </section>
  );
}

function Wrap({ children }: { children: ReactNode }) {
  return <section className="max-w-5xl mx-auto px-4 py-14 md:py-20">{children}</section>;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center mb-10">
      {eyebrow && <p className="text-xs tracking-[0.3em] text-[var(--c-hl)] font-semibold mb-2">{eyebrow}</p>}
      <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
      <span className="block w-10 h-0.5 bg-[var(--c-hl)] mx-auto mt-4" />
    </div>
  );
}

function ReserveButton({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-8 text-center">
      <Link
        href={href}
        className="inline-block px-10 py-3 rounded-[var(--r-btn)] font-semibold bg-[var(--c-primary)] text-[var(--c-on-primary)] hover:opacity-90 transition-opacity"
      >
        {label}
      </Link>
    </div>
  );
}

function SnsLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--c-muted)] hover:text-[var(--c-fg)]">
      {children}
    </a>
  );
}
