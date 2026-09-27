/**
 * 店舗サイト用フォント（next/font でセルフホスト）
 *
 * preload: false — 日本語フォントは unicode-range で分割配信されるため、
 * 実際に使われたテーマのフォント・文字のぶんだけがダウンロードされる。
 */
import { Noto_Sans_JP, Noto_Serif_JP, Zen_Maru_Gothic, Zen_Kaku_Gothic_New } from "next/font/google";
import type { ThemeFont } from "./config";

const gothic = Noto_Sans_JP({ weight: ["400", "500", "700"], subsets: ["latin"], preload: false, display: "swap" });
const mincho = Noto_Serif_JP({ weight: ["400", "500", "700"], subsets: ["latin"], preload: false, display: "swap" });
const rounded = Zen_Maru_Gothic({ weight: ["400", "500", "700"], subsets: ["latin"], preload: false, display: "swap" });
const modern = Zen_Kaku_Gothic_New({ weight: ["400", "500", "700"], subsets: ["latin"], preload: false, display: "swap" });

export const SITE_FONT_CLASS: Record<ThemeFont, string> = {
  gothic: gothic.className,
  mincho: mincho.className,
  rounded: rounded.className,
  modern: modern.className,
};

export const SITE_FONT_LABELS: Record<ThemeFont, string> = {
  gothic: "ゴシック（Noto Sans JP）",
  mincho: "明朝（Noto Serif JP）",
  rounded: "丸ゴシック（Zen Maru Gothic）",
  modern: "モダン（Zen Kaku Gothic New）",
};
