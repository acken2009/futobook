import Link from "next/link";

/**
 * プラン機能フェンスの案内表示（ダッシュボード用）
 * - full: ページ全体を置き換える案内
 * - banner: ページ上部に出す注意バナー
 */
export function UpgradeNotice({
  message,
  variant = "full",
}: {
  message: string;
  variant?: "full" | "banner";
}) {
  if (variant === "banner") {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-6 text-sm flex items-center justify-between gap-4">
        <span>🔒 {message}</span>
        <Link
          href="/dashboard/billing"
          className="shrink-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          プランを見る
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-2">この機能は上位プランでご利用いただけます</h2>
        <p className="text-gray-500 mb-6">{message}</p>
        <Link
          href="/dashboard/billing"
          className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          プランをアップグレード
        </Link>
      </div>
    </div>
  );
}
