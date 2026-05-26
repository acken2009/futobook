import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ReserveForm } from "./reserve-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ReservePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select(`
      id, name, slug,
      store_customizations(primary_color, secondary_color),
      service_items(id, name, price, duration_minutes),
      reservation_settings(*),
      availability_schedules(*)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!store) notFound();

  const custom = (store.store_customizations as any);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header
        className="py-8 px-4 text-white"
        style={{ background: `linear-gradient(135deg, ${custom?.primary_color ?? "#3B82F6"} 0%, ${custom?.secondary_color ?? "#1E40AF"} 100%)` }}
      >
        <div className="max-w-lg mx-auto">
          <a href={`/store/${slug}`} className="text-white/80 hover:text-white text-sm">
            ← {store.name} に戻る
          </a>
          <h1 className="text-2xl font-bold mt-2">予約する</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <ReserveForm
          store={store}
          services={(store.service_items as any[]) ?? []}
          settings={(store.reservation_settings as any) ?? null}
          schedules={(store.availability_schedules as any[]) ?? []}
          primaryColor={custom?.primary_color ?? "#3B82F6"}
        />
      </div>
    </div>
  );
}
