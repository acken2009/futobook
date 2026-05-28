import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { apiError } from "@/lib/utils";

const BUCKET = "store-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"];

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const bucketConfig = {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  };
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, bucketConfig);
  } else {
    // バケットが既に存在する場合は設定を更新（MIME typeを追加するため）
    await supabaseAdmin.storage.updateBucket(BUCKET, bucketConfig);
  }
}

// ギャラリー画像一覧
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id");
  if (!storeId) return apiError("store_id が必要です", 400);

  const { data, error } = await supabaseAdmin
    .from("store_images")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order")
    .order("created_at");

  if (error) return apiError(error.message, 500);
  return Response.json({ images: data });
}

// 画像アップロード
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!store) return apiError("店舗が見つかりません", 404);

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as string) ?? "gallery"; // logo | cover | gallery

  if (!file) return apiError("ファイルが必要です", 400);
  if (file.size > MAX_FILE_SIZE) return apiError("5MB以下のファイルを選択してください", 400);
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return apiError(`この画像形式（${file.type}）はサポートされていません。PNG・JPG・WebP・AVIF形式をお使いください`, 400);
  }

  await ensureBucket();

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${store.id}/${type}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) return apiError(uploadError.message, 500);

  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  // logo/cover はstore_customizationsを更新
  if (type === "logo" || type === "cover") {
    const field = type === "logo" ? "logo_url" : "cover_image_url";
    await supabaseAdmin
      .from("store_customizations")
      .upsert({ store_id: store.id, [field]: publicUrl }, { onConflict: "store_id" });
    return Response.json({ url: publicUrl });
  }

  // gallery は store_images に追加
  const { data: image, error: dbError } = await supabaseAdmin
    .from("store_images")
    .insert({ store_id: store.id, url: publicUrl, storage_path: path })
    .select()
    .single();

  if (dbError) return apiError(dbError.message, 500);
  return Response.json({ image }, { status: 201 });
}
