"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDashboardLang } from "@/app/actions/set-lang";

export function LangToggle({ currentLang }: { currentLang: "ja" | "en" }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const newLang = currentLang === "en" ? "ja" : "en";
    startTransition(async () => {
      await setDashboardLang(newLang);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 py-1.5 px-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
    >
      🌐 {currentLang === "en" ? "日本語に切り替え" : "Switch to English"}
    </button>
  );
}
