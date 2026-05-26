import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { sendEmail } from "@/lib/email/send";
import { reservationConfirmationEmail, reservationNotificationEmail } from "@/lib/email/templates";
import { reservationRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const ReserveSchema = z.object({
  store_id: z.string().uuid(),
  service_item_id: z.string().uuid().nullable().optional(),
  reserved_at: z.string().datetime(),
  party_size: z.number().int().min(1).max(20),
  notes: z.string().max(500).optional(),
  requires_payment: z.boolean().optional(),
  customer: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
  }),
});

export async function POST(request: NextRequest) {
  // レートリミット: IPアドレスベース（10分に10回まで）
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = reservationRateLimit(ip);
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const result = ReserveSchema.safeParse(body);
  if (!result.success) {
    return apiError(result.error.errors[0].message, 400);
  }

  const {
    store_id,
    service_item_id,
    reserved_at,
    party_size,
    notes,
    requires_payment,
    customer,
  } = result.data;

  // 店舗確認
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, name, slug, owner_id")
    .eq("id", store_id)
    .eq("status", "active")
    .single();

  if (!store) return apiError("店舗が見つかりません", 404);

  // サービス金額取得
  let totalAmount: number | null = null;
  let serviceName: string | undefined;
  if (service_item_id) {
    const { data: service } = await supabaseAdmin
      .from("service_items")
      .select("price, name")
      .eq("id", service_item_id)
      .eq("store_id", store_id)
      .single();
    totalAmount = service?.price ?? null;
    serviceName = service?.name;
  }

  // 顧客の検索 or 作成
  const { data: existingCustomer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("store_id", store_id)
    .eq("email", customer.email)
    .single();

  let customerId: string;
  if (existingCustomer) {
    customerId = existingCustomer.id;
    await supabaseAdmin
      .from("customers")
      .update({ name: customer.name, phone: customer.phone ?? null })
      .eq("id", customerId);
  } else {
    const { data: newCustomer, error: ce } = await supabaseAdmin
      .from("customers")
      .insert({
        store_id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone ?? null,
      })
      .select("id")
      .single();
    if (ce) return apiError("顧客情報の作成に失敗しました", 500);
    customerId = newCustomer.id;
  }

  // 予約を作成
  // 有料の場合は pending, 無料は即 confirmed
  const isPaid = requires_payment && totalAmount && totalAmount > 0;
  const status = isPaid ? "pending" : "confirmed";

  const { data: reservation, error: re } = await supabaseAdmin
    .from("reservations")
    .insert({
      store_id,
      customer_id: customerId,
      service_item_id: service_item_id ?? null,
      reserved_at,
      party_size,
      notes: notes ?? null,
      status,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (re) {
    if (re.code === "23505") {
      return apiError(
        "この時間帯はすでに予約が入っています。別の時間をお選びください。",
        409
      );
    }
    return apiError("予約の作成に失敗しました", 500);
  }

  // 無料予約は即メール送信
  if (!isPaid) {
    // ① 顧客への確認メール
    const { subject: custSubject, html: custHtml } = reservationConfirmationEmail({
      customerName: customer.name,
      storeName: store.name,
      reservedAt: reserved_at,
      serviceName,
      partySize: party_size,
      storeSlug: store.slug,
    });
    await sendEmail({
      to: customer.email,
      subject: custSubject,
      html: custHtml,
      storeId: store_id,
      type: "reservation_confirmation",
    });

    // ② 店舗オーナーへの通知メール
    if (store.owner_id) {
      const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(store.owner_id);
      if (ownerUser?.user?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const { subject: ownerSubject, html: ownerHtml } = reservationNotificationEmail({
          storeName: store.name,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          reservedAt: reserved_at,
          serviceName,
          partySize: party_size,
          notes: notes,
          dashboardUrl: `${appUrl}/dashboard/reservations`,
        });
        await sendEmail({
          to: ownerUser.user.email,
          subject: ownerSubject,
          html: ownerHtml,
          storeId: store_id,
          type: "reservation_notification",
        });
      }
    }
  }

  return Response.json({ reservation }, { status: 201 });
}

// 予約一覧（店舗オーナー向け）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");
  if (!storeId) return apiError("store_id が必要です", 400);

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select(`
      *,
      customers(name, email, phone),
      service_items(name, price)
    `)
    .eq("store_id", storeId)
    .order("reserved_at", { ascending: true });

  if (error) return apiError(error.message, 500);
  return Response.json({ reservations: data });
}
