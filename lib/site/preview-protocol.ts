/** サイト作成画面 ⇄ プレビュー iframe 間の postMessage 形式 */
import type { SiteConfig } from "./config";

export const PREVIEW_MESSAGE = "futobook-site-preview";

export type PreviewMessage =
  | { source: typeof PREVIEW_MESSAGE; kind: "update"; config: SiteConfig; primaryColor: string; secondaryColor: string }
  | { source: typeof PREVIEW_MESSAGE; kind: "scroll"; sectionId: string }
  | { source: typeof PREVIEW_MESSAGE; kind: "ready" };
