import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { LogoutButton } from "@/components/dashboard/logout-button";

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

  // ユーザーの店舗を取得
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("owner_id", user.id);

  const navItems = [
    { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
    { href: "/dashboard/customization", label: "店舗カスタマイズ", icon: "🎨" },
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
            StorePlatform
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

        <div className="p-4 border-t border-gray-200">
          {stores && stores.length > 0 && (
            <Link
              href={`/store/${stores[0].slug}`}
              target="_blank"
              className="block text-center text-sm text-blue-600 hover:underline mb-3"
            >
              店舗ページを見る →
            </Link>
          )}
          <p className="text-xs text-gray-400 mb-2 truncate">{user.email}</p>
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
