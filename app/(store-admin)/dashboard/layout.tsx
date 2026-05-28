import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLang } from "@/lib/lang";
import Link from "next/link";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { LangToggle } from "@/components/dashboard/lang-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const lang = await getLang();

  // ユーザーの店舗を取得
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("owner_id", user.id);

  const navItems = lang === "en"
    ? [
        { href: "/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/dashboard/customization", label: "Customization", icon: "🎨" },
        { href: "/dashboard/services", label: "Services", icon: "🛠️" },
        { href: "/dashboard/availability", label: "Hours & Slots", icon: "📅" },
        { href: "/dashboard/reservations", label: "Reservations", icon: "📋" },
        { href: "/dashboard/subscriptions", label: "Subscriptions", icon: "🔄" },
        { href: "/dashboard/analytics", label: "Analytics", icon: "📈" },
        { href: "/dashboard/billing", label: "Plan & Billing", icon: "💳" },
      ]
    : [
        { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
        { href: "/dashboard/customization", label: "店舗カスタマイズ", icon: "🎨" },
        { href: "/dashboard/services", label: "サービスメニュー", icon: "🛠️" },
        { href: "/dashboard/availability", label: "営業時間・枠設定", icon: "📅" },
        { href: "/dashboard/reservations", label: "予約管理", icon: "📋" },
        { href: "/dashboard/subscriptions", label: "サブスクプラン", icon: "🔄" },
        { href: "/dashboard/analytics", label: "アナリティクス", icon: "📈" },
        { href: "/dashboard/billing", label: "プラン・請求", icon: "💳" },
      ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* サイドバー */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/" className="text-xl font-bold text-blue-600">
            Futobook
          </Link>
          {stores && stores.length > 0 && (
            <p className="text-sm text-gray-500 mt-1 truncate">
              {stores[0].name}
            </p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          {stores && stores.length > 0 && (
            <Link
              href={`/store/${stores[0].slug}`}
              target="_blank"
              className="block text-center text-sm text-blue-600 hover:underline"
            >
              {lang === "en" ? "View store page →" : "店舗ページを見る →"}
            </Link>
          )}
          <LangToggle currentLang={lang} />
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
