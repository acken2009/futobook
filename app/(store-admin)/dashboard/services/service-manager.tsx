"use client";

import { useState } from "react";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  storeId: string;
  initialItems: ServiceItem[];
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "",
};

export function ServiceManager({ storeId: _storeId, initialItems }: Props) {
  const [items, setItems] = useState<ServiceItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(item: ServiceItem) {
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: item.price != null ? String(item.price) : "",
      duration_minutes: item.duration_minutes != null ? String(item.duration_minutes) : "",
    });
    setEditingId(item.id);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price !== "" ? Number(form.price) : null,
      duration_minutes: form.duration_minutes !== "" ? Number(form.duration_minutes) : null,
    };

    try {
      if (editingId) {
        // 更新
        const res = await fetch(`/api/service-items/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        const { item } = await res.json();
        setItems((prev) => prev.map((i) => (i.id === editingId ? item : i)));
      } else {
        // 新規作成
        const res = await fetch("/api/service-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        const { item } = await res.json();
        setItems((prev) => [...prev, item]);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(item: ServiceItem) {
    const res = await fetch(`/api/service-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    if (res.ok) {
      const { item: updated } = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このサービスを削除しますか？")) return;
    const res = await fetch(`/api/service-items/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <div>
      {/* サービス一覧 */}
      {items.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🛠️</p>
          <p className="mb-4">まだサービスメニューがありません</p>
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            最初のサービスを追加
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                  item.is_active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    {!item.is_active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        非公開
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 mb-1">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-blue-600">
                      {item.price != null ? `¥${item.price.toLocaleString()}` : "無料"}
                    </span>
                    {item.duration_minutes && (
                      <span className="text-gray-400">{item.duration_minutes}分</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(item)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    {item.is_active ? "非公開にする" : "公開する"}
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!showForm && (
            <button
              onClick={openCreate}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
            >
              ＋ サービスを追加
            </button>
          )}
        </>
      )}

      {/* 追加・編集フォーム */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-4"
        >
          <h3 className="font-semibold mb-4 text-gray-800">
            {editingId ? "サービスを編集" : "新しいサービスを追加"}
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                サービス名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="例：レオパ触れ合い体験"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="サービスの詳細説明（任意）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                料金（円）
              </label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                min={0}
                placeholder="0（空欄で無料）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">空欄または0で「無料」と表示されます</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所要時間（分）
              </label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                min={1}
                max={480}
                placeholder="例：60"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? "保存中..." : editingId ? "更新する" : "追加する"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-5 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
