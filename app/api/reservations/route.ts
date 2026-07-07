import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { sendEmail } from "@/lib/email/send";
import { sendLineMessage } from "@/lib/line/send";
import { reservationConfirmationEmail, reservationNotificationEmail } from "@/lib/email/templates";
import { reservationRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  validateReservationSlot,
  DEFAULT_SETTINGS,
  JST_OFFSET_MS,
  type ReservationSettings,
  type AvailabilitySchedule,
  type AvailabilityOverride,
} from "@/lib/reservations/validate";
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
  const rl = await reservationRateLimit(ip);
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

  // 店舗確認（営業時間・予約設定も同時取得）
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select(`
      id, name, slug, owner_id, platform_plan_id,
      reservation_settings(slot_duration_minutes, max_party_size, advance_booking_days),
      availability_schedules(day_of_week, open_time, close_time, is_closed),
      availability_overrides(date, is_closed, open_time, close_time)
    `)
    .eq("id", store_id)
    .eq("status", "active")
    .single();

  if (!store) return apiError("店舗が見つかりません", 404);

  // ── サーバー側バリデーション（クライアントの値は信用しない） ──
  const rawSettings = store.reservation_settings;
  const settings: ReservationSettings =
    (Array.isArray(rawSettings) ? rawSettings[0] : rawSettings) ?? DEFAULT_SETTINGS;
  const schedules = (store.availability_schedules ?? []) as AvailabilitySchedule[];
  const overrides = (store.availability_overrides ?? []) as AvailabilityOverride[];

  if (party_size > settings.max_party_size) {
    return apiError(`人数は${settings.max_party_size}名までです`, 400);
  }

  const slotCheck = validateReservationSlot({
    reservedAt: new Date(reserved_at),
    settings,
    schedules,
    overrides,
  });
  if (!slotCheck.ok) {
    return apiError(slotCheck.reason, 400);
  }

  // ── プランの月間予約上限チェック（スタータープラン: 月20件など） ──
  if (store.platform_plan_id) {
    const { data: plan } = await supabaseAdmin
      .from("platform_subscription_plans")
      .select("max_reservations_per_month")
      .eq("id", store.platform_plan_id)
      .single();

    const monthlyLimit = plan?.max_reservations_per_month;
    if (monthlyLimit) {
      // 当月（JST）に受け付けた予約数をカウント（キャンセル分は除く）
      const jstNow = new Date(Date.now() + JST_OFFSET_MS);
      const monthStart = new Date(
        Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), 1) - JST_OFFSET_MS
      );
      const { count } = await supabaseAdmin
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store_id)
        .neq("status", "cancelled")
        .gte("created_at", monthStart.toISOString());

      if ((count ?? 0) >= monthlyLimit) {
        return apiError(
          "今月のオンライン予約受付は上限に達しました。お手数ですが店舗へ直接お問い合わせください。",
          400
        );
      }
    }
  }

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

  // キャンセルトークン生成（予約日時の2時間前まで有効）
  const cancelToken = randomBytes(32).toString("hex");
  const reservedAtDate = new Date(reserved_at);
  const cancelTokenExpiresAt = new Date(reservedAtDate.getTime() - 2 * 60 * 60 * 1000);

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
      cancel_token: cancelToken,
      cancel_token_expires_at: cancelTokenExpiresAt.toISOString(),
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const cancelUrl = `${appUrl}/store/${store.slug}/reserve/cancel?token=${cancelToken}`;

    // ① 顧客への確認メール（キャンセルリンク付き）
    const { subject: custSubject, html: custHtml } = reservationConfirmationEmail({
      customerName: customer.name,
      storeName: store.name,
      reservedAt: reserved_at,
      serviceName,
      partySize: party_size,
      storeSlug: store.slug,
      cancelUrl,
    });
    await sendEmail({
      to: customer.email,
      subject: custSubject,
      html: custHtml,
      storeId: store_id,
      type: "reservation_confirmation",
    });

    // ② 顧客へLINE通知
    const { data: customerWithLine } = await supabaseAdmin
      .from("customers")
      .select("line_user_id")
      .eq("id", customerId)
      .single();
    const lineUserId = (customerWithLine as any)?.line_user_id;
    if (lineUserId) {
      const reservedAtDate = new Date(reserved_at);
      const dateStr = reservedAtDate.toLocaleString("ja-JP", {
        month: "long", day: "numeric", weekday: "short",
        hour: "2-digit", minute: "2-digit",
      });
      const lineMsg = `✅ 予約確定！\n${store.name}\n${dateStr}${serviceName ? `\n${serviceName}` : ""}\n\nキャンセルはこちら:\n${cancelUrl}`;
      await sendLineMessage({ lineUserId, message: lineMsg, storeId: store_id });
    }

    // ③ 店舗オーナーへの通知メール
    if (store.owner_id) {
      const { data: ownerUser } = await supabaseAdmin.auth.admin.getUserById(store.owner_id);
      if (ownerUser?.user?.email) {
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

  // オーナー認証：リクエストユーザーがこの店舗のオーナーか確認
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", user.id)
    .single();
  if (!store) return apiError("Forbidden", 403);

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
