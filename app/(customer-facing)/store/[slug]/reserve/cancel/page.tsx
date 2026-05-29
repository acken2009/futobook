import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import CancelConfirmButton from "./cancel-confirm-button";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function ReservationCancelPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { token } = await searchParams;

  if (!token) {
    return <ErrorPage slug={slug} message="キャンセルリンクが無効です。" />;
  }

  // トークンで予約を検索
  const { data: reservation } = await supabaseAdmin
    .from("reservations")
    .select(`
      id, reserved_at, party_size, status, cancel_token_expires_at,
      customers(name, email),
      service_items(name),
      stores(name, slug)
    `)
    .eq("cancel_token", token)
    .single();

  if (!reservation) {
    return <ErrorPage slug={slug} message="キャンセルリンクが無効または期限切れです。" />;
  }

  const store = reservation.stores as unknown as { name: string; slug: string } | null;
  const customer = reservation.customers as unknown as { name: string; email: string } | null;
  const service = reservation.service_items as unknown as { name: string } | null;

  if (reservation.status === "cancelled") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold mb-2">キャンセル済みです</h1>
          <p className="text-gray-600 mb-6">この予約はすでにキャンセルされています。</p>
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

  if (reservation.status === "completed") {
    return <ErrorPage slug={slug} message="完了済みの予約はキャンセルできません。" />;
  }

  const now = new Date();
  const expiresAt = reservation.cancel_token_expires_at
    ? new Date(reservation.cancel_token_expires_at)
    : null;
  const isExpired = expiresAt ? now > expiresAt : false;

  if (isExpired) {
    return (
      <ErrorPage
        slug={slug}
        message="キャンセル受付期限（予約の2時間前）を過ぎています。店舗に直接お問い合わせください。"
      />
    );
  }

  const date = new Date(reservation.reserved_at).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const deadlineStr = expiresAt
    ? expiresAt.toLocaleString("ja-JP", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">予約のキャンセル</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          以下の予約をキャンセルしますか？
        </p>

        {/* 予約内容 */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">店舗</span>
            <span className="font-semibold">{store?.name}</span>
          </div>
          {customer && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">お名前</span>
              <span className="font-semibold">{customer.name} 様</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">日時</span>
            <span className="font-semibold">{date}</span>
          </div>
          {service && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">サービス</span>
              <span className="font-semibold">{service.name}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">人数</span>
            <span className="font-semibold">{reservation.party_size}名</span>
          </div>
        </div>

        {/* 期限表示 */}
        {deadlineStr && (
          <p className="text-xs text-gray-400 text-center mb-5">
            キャンセル受付期限：{deadlineStr} まで
          </p>
        )}

        {/* キャンセルボタン（クライアントコンポーネント） */}
        <CancelConfirmButton token={token} storeSlug={slug} />

        <div className="mt-4 text-center">
          <Link
            href={`/store/${slug}`}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            キャンセルしない（店舗ページに戻る）
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorPage({ slug, message }: { slug: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold mb-2">キャンセルできません</h1>
        <p className="text-gray-600 mb-6">{message}</p>
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
