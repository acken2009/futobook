export const metadata = {
  title: "プライバシーポリシー | Futobook",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-2xl mx-auto prose prose-gray">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. 収集する情報</h2>
            <p>Futobook（以下「当サービス」）は、以下の情報を収集します。</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>店舗オーナー：メールアドレス、店舗名、決済情報（Stripe経由）</li>
              <li>予約顧客：氏名、メールアドレス、電話番号、予約内容</li>
              <li>利用ログ：アクセス日時、IPアドレス、ブラウザ情報</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. 情報の利用目的</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>予約・サブスクリプション・決済サービスの提供</li>
              <li>予約確認・リマインダー・キャンセル通知の送信</li>
              <li>サービス改善および不正利用の防止</li>
              <li>法令に基づく対応</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. 第三者への提供</h2>
            <p>
              当サービスは、以下のサービスに情報を提供します。これらのサービスは独自のプライバシーポリシーに基づき情報を管理します。
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Stripe, Inc.（決済処理）</li>
              <li>Supabase, Inc.（データベース・認証）</li>
              <li>Resend（メール配信）</li>
              <li>Vercel, Inc.（ホスティング）</li>
              <li>LINE Corporation（LINE通知、オプション）</li>
            </ul>
            <p className="mt-2">法令に基づく場合を除き、上記以外の第三者に個人情報を提供することはありません。</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. 情報の保管と保護</h2>
            <p>
              お客様の情報はSupabaseのセキュアなデータベースに保管され、暗号化・アクセス制御により保護されます。
              不要になった個人情報は適切に削除します。
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. お客様の権利</h2>
            <p>
              個人情報の開示・訂正・削除を希望される場合は、
              <a href="mailto:acken2009@gmail.com" className="text-blue-600 hover:underline">acken2009@gmail.com</a>
              までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. Cookieの使用</h2>
            <p>
              当サービスはセッション管理のためにCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、
              一部のサービスが正常に動作しない場合があります。
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">7. ポリシーの変更</h2>
            <p>
              本ポリシーは予告なく変更される場合があります。重要な変更がある場合はサービス上でお知らせします。
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">8. お問い合わせ</h2>
            <p>
              本ポリシーに関するご質問は{" "}
              <a href="mailto:acken2009@gmail.com" className="text-blue-600 hover:underline">acken2009@gmail.com</a>
              {" "}までご連絡ください。
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-4 border-t">最終更新日：2026年6月</p>
        </div>
      </div>
    </main>
  );
}
