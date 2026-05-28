"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface StoreImage {
  id: string;
  url: string;
}

interface Props {
  storeId: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  initialImages: StoreImage[];
}

export function MediaUploader({ storeId: _storeId, logoUrl: initialLogo, coverUrl: initialCover, initialImages }: Props) {
  const [logoUrl, setLogoUrl] = useState(initialLogo ?? "");
  const [coverUrl, setCoverUrl] = useState(initialCover ?? "");
  const [images, setImages] = useState<StoreImage[]>(initialImages);
  const [uploading, setUploading] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, type: "logo" | "cover" | "gallery") {
    setUploading(type);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);

    try {
      const res = await fetch("/api/store-images", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "アップロードに失敗しました");
        return;
      }
      const data = await res.json();
      if (type === "logo") setLogoUrl(data.url);
      else if (type === "cover") setCoverUrl(data.url);
      else setImages((prev) => [...prev, data.image]);
    } finally {
      setUploading(null);
    }
  }

  async function deleteImage(id: string) {
    if (!confirm("この画像を削除しますか？")) return;
    const res = await fetch(`/api/store-images/${id}`, { method: "DELETE" });
    if (res.ok) setImages((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-8">
      {/* ロゴ */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">店舗ロゴ</h3>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => logoRef.current?.click()}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt="ロゴ" width={80} height={80} className="object-cover w-full h-full" unoptimized />
            ) : (
              <span className="text-3xl">🏪</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              disabled={uploading === "logo"}
              className="text-sm bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {uploading === "logo" ? "アップロード中..." : "画像を選択"}
            </button>
            <p className="text-xs text-gray-400 mt-1">PNG・JPG・WebP・AVIF、5MB以下</p>
          </div>
          <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "logo"); e.target.value = ""; }}
          />
        </div>
      </div>

      {/* カバー画像 */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">カバー画像（ヘッダー背景）</h3>
        <div
          className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-center"
          onClick={() => coverRef.current?.click()}
        >
          {coverUrl ? (
            <Image src={coverUrl} alt="カバー" width={600} height={128} className="object-cover w-full h-full" unoptimized />
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-2xl mb-1">🖼️</p>
              <p className="text-sm">クリックして画像を選択</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">推奨サイズ：1200×400px</p>
          {uploading === "cover" && <span className="text-xs text-blue-500">アップロード中...</span>}
        </div>
        <input ref={coverRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "cover"); e.target.value = ""; }}
        />
      </div>

      {/* ギャラリー */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">ギャラリー写真</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
              <Image src={img.url} alt="" fill className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => deleteImage(img.id)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={!!uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 disabled:opacity-50"
          >
            {uploading === "gallery" ? (
              <span className="text-xs">アップロード中...</span>
            ) : (
              <>
                <span className="text-2xl">＋</span>
                <span className="text-xs mt-1">写真を追加</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400">店内・商品・雰囲気などの写真を追加できます（PNG・JPG・WebP・AVIF、5MB以下）</p>
        <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif" multiple className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            for (const f of files) await uploadFile(f, "gallery");
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
