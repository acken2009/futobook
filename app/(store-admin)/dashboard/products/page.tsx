"use client";

import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number | null;
  is_active: boolean;
  sort_order: number;
}

const empty = (): Partial<Product> => ({
  name: "",
  description: "",
  price: 0,
  stock_quantity: null,
  is_active: true,
  sort_order: 0,
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/products/admin");
    if (res.ok) {
      const json = await res.json();
      setProducts(json.products ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !editing.id;
      const url = isNew ? "/api/products" : `/api/products/${editing.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "保存に失敗しました");
      } else {
        setEditing(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("この商品を削除しますか？")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "削除に失敗しました");
      return;
    }
    await load();
  }

  async function toggleActive(p: Product) {
    await fetch(`/api/products/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    await load();
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
          <p className="text-sm text-gray-500 mt-1">店舗ショップで販売する商品を管理します</p>
        </div>
        <button
          onClick={() => setEditing(empty())}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
        >
          + 商品を追加
        </button>
      </div>

      {/* 編集フォーム */}
      {editing && (
        <div className="bg-white border border-blue-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">{editing.id ? "商品を編集" : "新しい商品"}</h2>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">商品名 *</label>
              <input
                type="text"
                value={editing.name ?? ""}
                onChange={e => setEditing(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="例：トリートメント 100ml"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea
                value={editing.description ?? ""}
                onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="商品の説明"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）*</label>
              <input
                type="number"
                min={0}
                value={editing.price ?? 0}
                onChange={e => setEditing(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">在庫数（空欄=無制限）</label>
              <input
                type="number"
                min={0}
                value={editing.stock_quantity ?? ""}
                onChange={e => setEditing(prev => ({
                  ...prev,
                  stock_quantity: e.target.value === "" ? null : parseInt(e.target.value) || 0,
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="無制限"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">表示順</label>
              <input
                type="number"
                min={0}
                value={editing.sort_order ?? 0}
                onChange={e => setEditing(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="is_active"
                checked={editing.is_active ?? true}
                onChange={e => setEditing(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">公開する</label>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={save}
              disabled={saving || !editing.name}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={() => { setEditing(null); setError(null); }}
              className="text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 商品一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🛍️</p>
          <p>商品がまだありません</p>
          <p className="text-sm mt-1">「商品を追加」から最初の商品を登録しましょう</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">商品名</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">価格</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">在庫</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">状態</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    {p.description && <p className="text-gray-400 text-xs truncate max-w-xs">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">¥{p.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {p.stock_quantity === null ? "∞" : p.stock_quantity}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(p)}>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.is_active ? "公開中" : "非公開"}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setEditing(p)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
