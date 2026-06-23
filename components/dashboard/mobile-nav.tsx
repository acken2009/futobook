"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface Props {
  navItems: NavItem[];
  storeName?: string;
  storeSlug?: string;
  userEmail?: string;
  lang?: string;
}

export function MobileNav({ navItems, storeName, storeSlug, userEmail, lang }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* モバイルトップバー */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center px-4 h-14">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="メニューを開く"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="ml-3 font-bold text-blue-600 text-lg">Futobook</span>
        {storeName && (
          <span className="ml-2 text-sm text-gray-500 truncate max-w-[160px]">{storeName}</span>
        )}
      </div>

      {/* オーバーレイ */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ドロワー */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-xl flex flex-col transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <Link href="/" className="text-xl font-bold text-blue-600" onClick={() => setOpen(false)}>
              Futobook
            </Link>
            {storeName && <p className="text-sm text-gray-500 mt-0.5 truncate">{storeName}</p>}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-3">
          {storeSlug && (
            <Link
              href={`/store/${storeSlug}`}
              target="_blank"
              className="block text-center text-sm text-blue-600 hover:underline py-2"
            >
              {lang === "en" ? "View store page →" : "店舗ページを見る →"}
            </Link>
          )}
          {userEmail && (
            <p className="text-xs text-gray-400 truncate text-center">{userEmail}</p>
          )}
        </div>
      </div>
    </>
  );
}
