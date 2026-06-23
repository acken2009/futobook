export const metadata = {
  title: "利用規約 | Futobook",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">利用規約</h1>
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">第1条（適用）</h2>
            <p>
              本規約は、Futobook（以下「当サービス」）が提供する予約管理・サブスクリプション・決済プラットフォームの利用に関する条件を定めるものです。
              ご登録いただくことで、本規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">第2条（アカウント）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>登録情報は正確な情報を提供してください</li>
              <li>アカウントの管理はご自身の責任で行ってください</li>
              <li>第三者へのアカウントの譲渡・共有は禁止します</li>
              <li>不正利用を発見した場合は速やかにご連絡ください</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">第3条（料金・支払い）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>料金は各プランに定める金額とします</li>
              <li>月額プランは毎月自動更新されます</li>
              <li>解約は次回更新日の前日までに手続きを行ってください</li>
              <li>支払い済み期間のご返金はいたしかねます</li>
              <li>決済はStripeを通じて行われます</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">第4条（禁止事項）</h2>
            <p>以下の行為を禁止します。</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>当サービスのシステムへの不正アクセス</li>
              <li>虚偽の情報を登録する行為</li>
              <li>他のユーザーへの迷惑行為</li>
              <li>当サービスの運営を妨害する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">第5条（サービスの変更・停止）</h2>
            <p>
              当サービスは、メンテナンスやシステム障害、その他の理由により予告なくサービスを一時停止または変更する場合があります。
              これによって生じた損害について、当サービスは責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">第6条（免責事項）</h2>
            <p>
              当サービスは、店舗オーナーと予約顧客間の取引に関して一切の責任を負いません。
              当サービスの利用によって生じた損害について、当サービスの故意または重大な過失によるものを除き、責任を負わないものとします。
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">第7条（個人情報）</h2>
            <p>
              個人情報の取り扱いについては、別途定める
              <a href="/privacy" className="text-blue-600 hover:underline ml-1">プライバシーポリシー</a>
              に従います。
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">第8条（準拠法・管轄）</h2>
            <p>本規約は日本法に準拠し、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
          </section>

          <p className="text-xs text-gray-400 pt-4 border-t">最終更新日：2026年6月</p>
        </div>
      </div>
    </main>
  );
}
