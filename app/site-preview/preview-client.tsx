"use client";

import { useEffect, useState } from "react";
import { SiteRenderer, type SiteData } from "@/components/site/site-renderer";
import type { SiteConfig } from "@/lib/site/config";
import { PREVIEW_MESSAGE, type PreviewMessage } from "@/lib/site/preview-protocol";

export function PreviewClient({ initialConfig, data }: { initialConfig: SiteConfig; data: SiteData }) {
  const [config, setConfig] = useState(initialConfig);
  const [colors, setColors] = useState({ primary: data.primaryColor, secondary: data.secondaryColor });

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // 同一オリジンの編集画面からのメッセージだけを受け付ける
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const msg = e.data as PreviewMessage;
      if (msg?.source !== PREVIEW_MESSAGE) return;
      if (msg.kind === "update") {
        setConfig(msg.config);
        setColors({ primary: msg.primaryColor, secondary: msg.secondaryColor });
      } else if (msg.kind === "scroll") {
        document.getElementById(`section-${msg.sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    window.addEventListener("message", onMessage);
    if (window.parent !== window) {
      window.parent.postMessage({ source: PREVIEW_MESSAGE, kind: "ready" } satisfies PreviewMessage, window.location.origin);
    }
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    // プレビュー内のリンクでは画面遷移させない
    <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) e.preventDefault(); }}>
      <SiteRenderer
        config={config}
        data={{ ...data, primaryColor: colors.primary, secondaryColor: colors.secondary }}
        editing
      />
    </div>
  );
}
