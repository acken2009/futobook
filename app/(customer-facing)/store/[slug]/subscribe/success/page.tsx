import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SubscribeSuccessPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🎊</div>
        <h1 className="text-2xl font-bold mb-2">サブスクリプション加入完了！</h1>
        <p className="text-gray-600 mb-6">
          ご加入ありがとうございます。<br />
          確認メールをお送りしました。次回更新日まで特典をお楽しみください。
        </p>
        <Link
          href={`/store/${slug}`}
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          店舗ページに戻る
        </Link>
      </div>
    </div>
  );
}
