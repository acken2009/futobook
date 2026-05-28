import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: image } = await supabaseAdmin
    .from("store_images")
    .select("id, storage_path, stores(owner_id)")
    .eq("id", id)
    .single();

  if (!image) return apiError("画像が見つかりません", 404);
  if ((image.stores as any)?.owner_id !== user.id) return apiError("権限がありません", 403);

  // Storageから削除
  if (image.storage_path) {
    await supabaseAdmin.storage.from("store-assets").remove([image.storage_path]);
  }

  await supabaseAdmin.from("store_images").delete().eq("id", id);
  return new Response(null, { status: 204 });
}
