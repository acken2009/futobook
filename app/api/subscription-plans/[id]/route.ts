import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { apiError } from "@/lib/utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await request.json();

  // 所有権確認
  const { data: plan } = await supabaseAdmin
    .from("store_subscription_plans")
    .select("id, stores(owner_id)")
    .eq("id", id)
    .single();

  if (!plan) return apiError("プランが見つかりません", 404);
  if ((plan.stores as any)?.owner_id !== user.id)
    return apiError("権限がありません", 403);

  const allowedFields = ["is_active", "name", "description", "features"];
  const update = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedFields.includes(key))
  );

  const { data: updated, error } = await supabaseAdmin
    .from("store_subscription_plans")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return Response.json({ plan: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: plan } = await supabaseAdmin
    .from("store_subscription_plans")
    .select("id, stripe_product_id, stores(owner_id, stripe_account_id)")
    .eq("id", id)
    .single();

  if (!plan) return apiError("プランが見つかりません", 404);
  if ((plan.stores as any)?.owner_id !== user.id)
    return apiError("権限がありません", 403);

  // Stripeのproductをアーカイブ（削除不可なのでarchive）
  if (plan.stripe_product_id && (plan.stores as any)?.stripe_account_id) {
    try {
      await stripe.products.update(
        plan.stripe_product_id,
        { active: false },
        { stripeAccount: (plan.stores as any).stripe_account_id }
      );
    } catch (e) {
      console.error("Stripe product archive failed:", e);
    }
  }

  const { error } = await supabaseAdmin
    .from("store_subscription_plans")
    .delete()
    .eq("id", id);

  if (error) return apiError(error.message, 500);
  return new Response(null, { status: 204 });
}
