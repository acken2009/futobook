"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isValidSlug } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  function handleNameChange(value: string) {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);
    // 日本語店舗名など英数字が残らない場合はタイムスタンプベースのスラッグを生成
    if (autoSlug.length >= 3) {
      setSlug(autoSlug);
    } else if (value.trim().length > 0) {
      setSlug("store-" + Date.now().toString(36));
    } else {
      setSlug("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidSlug(slug)) {
      setError("スラッグは英小文字・数字・ハイフンのみ、3〜50文字で入力してください");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // 店舗を作成
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .insert({ owner_id: user.id, name, slug })
      .select()
      .single();

    if (storeError) {
      setError(
        storeError.code === "23505"
          ? "このスラッグはすでに使用されています。別の名前をお試しください。"
          : storeError.message
      );
      setLoading(false);
      return;
    }

    // デフォルトのカスタマイズ・設定を作成
    await Promise.all([
      supabase.from("store_customizations").insert({ store_id: store.id }),
      supabase.from("reservation_settings").insert({ store_id: store.id }),
      // デフォルト営業時間（月〜土 10:00-18:00）
      supabase.from("availability_schedules").insert(
        [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          store_id: store.id,
          day_of_week: day,
          open_time: "10:00",
          close_time: "18:00",
          is_closed: day === 0, // 日曜はデフォルト休み
        }))
      ),
    ]);

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-2">ようこそ！</h1>
        <p className="text-gray-500 mb-8">
          まず、あなたの店舗を作成しましょう。
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              店舗名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: カフェ山田"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL（スラッグ）
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="bg-gray-50 px-3 py-2 text-gray-500 text-sm border-r border-gray-300">
                /store/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                required
                pattern="^[a-z0-9-]{3,50}$"
                className="flex-1 px-3 py-2 focus:outline-none text-sm"
                placeholder="cafe-yamada"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              英小文字・数字・ハイフンのみ（3〜50文字）
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "作成中..." : "店舗を作成する"}
          </button>
        </form>
      </div>
    </div>
  );
}
