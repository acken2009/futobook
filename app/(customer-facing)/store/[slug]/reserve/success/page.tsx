import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function ReserveSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { session_id } = await searchParams;

  let reservationInfo: { date: string; storeName: string } | null = null;

  if (session_id) {
    try {
      // 店舗のStripeアカウントIDを取得
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id, name, stripe_account_id")
        .eq("slug", slug)
        .single();

      if (store?.stripe_account_id) {
        const session = await stripe.checkout.sessions.retrieve(
          session_id,
          { expand: ["payment_intent"] },
          { stripeAccount: store.stripe_account_id }
        );

        const paymentIntent = session.payment_intent as any;
        const reservationId = paymentIntent?.metadata?.reservation_id;

        if (reservationId) {
          const { data: reservation } = await supabaseAdmin
            .from("reservations")
            .select("reserved_at")
            .eq("id", reservationId)
            .single();

          if (reservation) {
            reservationInfo = {
              date: new Date(reservation.reserved_at).toLocaleString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
              storeName: store.name,
            };
          }
        }
      }
    } catch (e) {
      console.error("Failed to retrieve session:", e);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">ご予約・お支払いが完了しました！</h1>
        {reservationInfo ? (
          <p className="text-gray-600 mb-6">
            <strong>{reservationInfo.storeName}</strong> の<br />
            {reservationInfo.date} のご予約を承りました。<br />
            確認メールをご確認ください。
          </p>
        ) : (
          <p className="text-gray-600 mb-6">
            ご予約を承りました。確認メールをご確認ください。
          </p>
        )}
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
