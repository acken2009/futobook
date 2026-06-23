import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";
import { sendEmail } from "@/lib/email/send";
import { reservationRescheduleEmail } from "@/lib/email/templates";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  status: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
});

const UpdateDateSchema = z.object({
  reserved_at: z.string().datetime(),
});

const UpdateSchema = z.union([UpdateStatusSchema, UpdateDateSchema]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .single();
  if (!store) return apiError("店舗が見つかりません", 404);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError("Invalid JSON", 400); }

  const result = UpdateSchema.safeParse(body);
  if (!result.success) return apiError(result.error.errors[0].message, 400);

  // ── 日時変更 ──
  if ("reserved_at" in result.data) {
    const newReservedAt = result.data.reserved_at;

    // 同時間帯に別の予約が存在しないか確認
    const { data: conflict } = await supabaseAdmin
      .from("reservations")
      .select("id")
      .eq("store_id", store.id)
      .eq("reserved_at", newReservedAt)
      .in("status", ["pending", "confirmed"])
      .neq("id", id)
      .single();

    if (conflict) return apiError("指定した日時はすでに予約が入っています", 409);

    // 変更前の予約情報を取得（メール送信用）
    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select(`
        reserved_at, party_size, cancel_token,
        customers(name, email),
        service_items(name)
      `)
      .eq("id", id)
      .eq("store_id", store.id)
      .single();

    if (!reservation) return apiError("予約が見つかりません", 404);

    // 日時変更時は cancel_token_expires_at も同時更新（予約2時間前が期限）
    const newCancelTokenExpiry = new Date(
      new Date(newReservedAt).getTime() - 2 * 60 * 60 * 1000
    ).toISOString();

    const { error } = await supabaseAdmin
      .from("reservations")
      .update({ reserved_at: newReservedAt, cancel_token_expires_at: newCancelTokenExpiry })
      .eq("id", id)
      .eq("store_id", store.id);

    if (error) return apiError("更新に失敗しました", 500);

    // 顧客へ変更通知メール
    const customer = reservation.customers as unknown as { name: string; email: string } | null;
    const service = reservation.service_items as unknown as { name: string } | null;
    if (customer?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const cancelUrl = reservation.cancel_token
        ? `${appUrl}/store/${store.slug}/reserve/cancel?token=${reservation.cancel_token}`
        : undefined;

      const { subject, html } = reservationRescheduleEmail({
        customerName: customer.name,
        storeName: store.name,
        oldReservedAt: reservation.reserved_at,
        newReservedAt,
        serviceName: service?.name,
        partySize: reservation.party_size,
        storeSlug: store.slug,
        cancelUrl,
      });
      await sendEmail({ to: customer.email, subject, html, storeId: store.id, type: "reservation_reschedule" });
    }

    return Response.json({ ok: true });
  }

  // ── ステータス変更 ──
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({ status: result.data.status })
    .eq("id", id)
    .eq("store_id", store.id)
    .select("id")
    .single();

  if (error || !data) return apiError("更新に失敗しました", 500);

  return Response.json({ ok: true });
}
