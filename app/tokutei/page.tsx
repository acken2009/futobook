export const metadata = {
  title: "特定商取引法に基づく表記 | Futobook",
};

const items = [
  { label: "販売業者", value: "Futobook（個人事業主）" },
  { label: "運営責任者", value: "acken2009@gmail.com 宛にお問い合わせください" },
  { label: "所在地", value: "請求があれば遅滞なく開示します" },
  { label: "電話番号", value: "請求があれば遅滞なく開示します" },
  { label: "メールアドレス", value: "acken2009@gmail.com" },
  { label: "サービス名", value: "Futobook（予約管理・サブスクリプション・決済プラットフォーム）" },
  {
    label: "利用料金",
    value: "スタータープラン：無料 / 詳細はダッシュボード内「プラン・請求」ページをご確認ください",
  },
  {
    label: "お支払い方法",
    value: "クレジットカード（Visa・Mastercard・American Express・JCB）/ Stripe決済",
  },
  {
    label: "サービス提供時期",
    value: "お申し込み後、即時ご利用いただけます",
  },
  {
    label: "返品・キャンセルについて",
    value:
      "月額プランは次回更新日の前日までにキャンセル手続きを行った場合、翌月以降の課金が停止されます。既にお支払いいただいた期間のご返金はいたしかねます。",
  },
  {
    label: "動作環境",
    value: "インターネット接続環境および最新のWebブラウザが必要です",
  },
];

export default function TokuteiPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">特定商取引法に基づく表記</h1>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <dl>
            {items.map((item, i) => (
              <div
                key={item.label}
                className={`flex flex-col sm:flex-row sm:gap-6 px-6 py-4 ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <dt className="text-sm font-semibold text-gray-700 sm:w-40 shrink-0 mb-1 sm:mb-0">
                  {item.label}
                </dt>
                <dd className="text-sm text-gray-600">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs text-gray-400 mt-6 text-center">最終更新日：2026年6月</p>
      </div>
    </main>
  );
}
