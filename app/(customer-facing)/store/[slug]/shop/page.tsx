"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number | null;
}

interface Store {
  id: string;
  name: string;
  slug: string;
}

export default function ShopPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ name: "", email: "" });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedProduct(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    (async () => {
      const storeRes = await fetch(`/api/store-info?slug=${slug}`);
      if (!storeRes.ok) { setLoading(false); return; }
      const { store: s } = await storeRes.json();
      setStore(s);

      const prodRes = await fetch(`/api/products?store_id=${s.id}`);
      if (prodRes.ok) {
        const { products: p } = await prodRes.json();
        setProducts(p ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  async function handleBuy() {
    if (!selectedProduct || !store) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customer.name.trim()) {
      setFormError("お名前を入力してください");
      return;
    }
    if (!emailRegex.test(customer.email)) {
      setFormError("有効なメールアドレスを入力してください");
      return;
    }
    setFormError(null);
    setBuying(selectedProduct.id);
    try {
      const res = await fetch("/api/stripe/product-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          product_id: selectedProduct.id,
          quantity: qty,
          customer,
        }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setFormError(json.error ?? "エラーが発生しました");
        setBuying(null);
      }
    } catch {
      setFormError("通信エラーが発生しました");
      setBuying(null);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-gray-400">店舗が見つかりません</div>;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <a href={`/store/${slug}`} className="text-sm text-blue-600 hover:underline">{"← "}{store.name} トップへ</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{store.name} ショップ</h1>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🛍️</p>
            <p>現在販売中の商品はありません</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900 text-lg">{p.name}</h2>
                  {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                  <p className="text-2xl font-bold text-gray-900 mt-3">
                    ¥{p.price.toLocaleString()}
                  </p>
                  {p.stock_quantity !== null && (
                    <p className={`text-xs mt-1 ${p.stock_quantity === 0 ? "text-red-500" : "text-gray-400"}`}>
                      {p.stock_quantity === 0 ? "在庫なし" : `残り${p.stock_quantity}個`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedProduct(p); setQty(1); setFormError(null); }}
                  disabled={p.stock_quantity === 0}
                  className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  購入する
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 購入フォームモーダル */}
        {selectedProduct && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="font-bold text-lg mb-1">{selectedProduct.name}</h2>
              <p className="text-gray-500 text-sm mb-4">¥{selectedProduct.price.toLocaleString()} / 個</p>

              {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">お名前 *</label>
                  <input
                    type="text"
                    value={customer.name}
                    onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="山田 太郎"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス *</label>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                    >−</button>
                    <span className="font-medium w-6 text-center">{qty}</span>
                    <button
                      onClick={() => setQty(q => {
                        if (selectedProduct.stock_quantity !== null) return Math.min(selectedProduct.stock_quantity, q + 1);
                        return q + 1;
                      })}
                      className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                    >+</button>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">合計</p>
                  <p className="text-xl font-bold">¥{(selectedProduct.price * qty).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleBuy}
                    disabled={!!buying}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {buying ? "処理中..." : "決済へ進む"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
