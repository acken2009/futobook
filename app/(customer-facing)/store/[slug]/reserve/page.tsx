import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ReserveForm } from "./reserve-form";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function ReservePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { lang } = await searchParams;
  const isEn = lang === "en";
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select(`
      id, name, slug,
      stripe_account_status,
      store_customizations(primary_color, secondary_color),
      service_items(id, name, price, duration_minutes, is_active),
      reservation_settings(*),
      availability_schedules(*)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  // 予約済みスロットを取得（pending/confirmed）
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + 60); // 60日先まで

  const { data: bookedReservations } = await supabaseAdmin
    .from("reservations")
    .select("reserved_at")
    .eq("store_id", store.id)
    .gte("reserved_at", now.toISOString())
    .lte("reserved_at", future.toISOString())
    .in("status", ["pending", "confirmed"]);

  const bookedSlots = (bookedReservations ?? []).map((r) => r.reserved_at as string);

  const custom = (store.store_customizations as any);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header
        className="py-8 px-4 text-white"
        style={{ background: `linear-gradient(135deg, ${custom?.primary_color ?? "#3B82F6"} 0%, ${custom?.secondary_color ?? "#1E40AF"} 100%)` }}
      >
        <div className="max-w-lg mx-auto">
              <a href={`/store/${slug}${isEn ? "?lang=en" : ""}`} className="text-white/80 hover:text-white text-sm">
            ← {isEn ? `Back to ${store.name}` : `${store.name} に戻る`}
          </a>
          <h1 className="text-2xl font-bold mt-2">{isEn ? "Book Now" : "予約する"}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <ReserveForm
          store={store}
          services={((store.service_items as any[]) ?? []).filter((s: any) => s.is_active !== false)}
          settings={(store.reservation_settings as any) ?? null}
          schedules={(store.availability_schedules as any[]) ?? []}
          primaryColor={custom?.primary_color ?? "#3B82F6"}
          bookedSlots={bookedSlots}
          lang={isEn ? "en" : "ja"}
        />
      </div>
    </div>
  );
}
