import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-20">
        {/* ヒーロー */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            あなたのお店を、
            <br />
            <span className="text-blue-600">デジタルで進化させる</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            予約・サブスク・クレジット決済をひとつのプラットフォームで。
            <br />
            店舗ページは自由にカスタマイズ可能です。
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              無料で始める
            </Link>
            <Link
              href="/store/demo"
              className="bg-white text-blue-600 border border-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              デモを見る
            </Link>
          </div>
        </div>

        {/* 機能紹介 */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: "📅",
              title: "スマート予約管理",
              desc: "営業時間・席数・予約ルールを柔軟に設定。顧客はいつでもオンライン予約できます。",
            },
            {
              icon: "🔄",
              title: "サブスクリプション",
              desc: "月額プランを作成して安定収益を確保。顧客の継続利用を促進します。",
            },
            {
              icon: "💳",
              title: "安全な決済",
              desc: "Stripe による安全なクレジットカード決済。売上は自動的に振り込まれます。",
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* 料金プラン */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">料金プラン</h2>
          <p className="text-center text-gray-500 mb-10">すべてのプランで初期費用・解約金なし。いつでも変更可能です。</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* スターター */}
            <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">スターター</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">¥0</span>
                  <span className="text-gray-500">/月</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">まず試してみたい方に</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 flex-1 mb-6">
                {["オンライン予約（月30件まで）", "サービスメニュー3件まで", "メール通知", "店舗ページ公開"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>{f}
                  </li>
                ))}
                <li className="flex items-center gap-2 pt-1 border-t border-gray-100 text-gray-400">
                  <span className="text-orange-400 font-bold text-xs">%</span>取引マージン 5%
                </li>
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-gray-100 text-gray-800 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                無料で始める
              </Link>
            </div>

            {/* ベーシック（おすすめ） */}
            <div className="bg-blue-600 rounded-2xl p-7 flex flex-col text-white relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                おすすめ
              </span>
              <div className="mb-4">
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">ベーシック</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">¥4,480</span>
                  <span className="text-blue-200">/月</span>
                </div>
                <p className="text-sm text-blue-200 mt-1">本格運用を始めたい方に</p>
              </div>
              <ul className="space-y-2 text-sm flex-1 mb-6">
                {[
                  "オンライン予約（無制限）",
                  "サービスメニュー無制限",
                  "クレジットカード決済",
                  "サブスクリプション販売",
                  "物販（商品販売機能）",
                  "LINE通知連携",
                  "キャンセルリマインダー",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-blue-200 font-bold">✓</span>{f}
                  </li>
                ))}
                <li className="flex items-center gap-2 pt-1 border-t border-blue-500 text-blue-200">
                  <span className="font-bold text-xs">%</span>取引マージン 3%
                </li>
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-white text-blue-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                無料で始める
              </Link>
            </div>

            {/* スタンダード */}
            <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">スタンダード</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">¥9,800</span>
                  <span className="text-gray-500">/月</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">複数スタッフで運営する方に</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 flex-1 mb-6">
                {[
                  "ベーシックの全機能",
                  "複数スタッフ管理",
                  "スタッフ別スケジュール",
                  "顧客カルテ",
                  "優先サポート（メール）",
                  "カスタムドメイン（近日公開）",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>{f}
                  </li>
                ))}
                <li className="flex items-center gap-2 pt-1 border-t border-gray-100 text-gray-400">
                  <span className="text-green-400 font-bold text-xs">%</span>取引マージン 1%
                </li>
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-gray-800 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
              >
                無料で始める
              </Link>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            ※ ベーシック・スタンダードは現在ベータリリース中につき、当面は全機能を無料でご利用いただけます。
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-500 mb-4">
            すでにアカウントをお持ちですか？
          </p>
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            ログインする →
          </Link>
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t border-gray-200 mt-20 py-8 text-center text-xs text-gray-400 space-x-4">
        <Link href="/tokutei" className="hover:underline">特定商取引法に基づく表記</Link>
        <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
        <Link href="/terms" className="hover:underline">利用規約</Link>
        <span>© 2026 Futobook</span>
      </footer>
    </main>
  );
}
