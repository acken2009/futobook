import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind クラス名を安全にマージ */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 金額を日本円表示にフォーマット */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}

/** 日時を日本語表示にフォーマット */
export function formatDatetime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** スラッグのバリデーション */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{3,50}$/.test(slug);
}

/** API エラーレスポンス生成 */
export function apiError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
