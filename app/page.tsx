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
    </main>
  );
}
