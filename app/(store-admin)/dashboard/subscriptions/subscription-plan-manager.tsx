"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  is_active: boolean;
  features: string[];
  stripe_price_id: string | null;
}

interface Props {
  storeId: string;
  plans: Plan[];
  canAcceptPayments: boolean;
}

export function SubscriptionPlanManager({ storeId, plans, canAcceptPayments }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localPlans, setLocalPlans] = useState(plans);

  const [form, setForm] = useState({
    name: "",
    name_en: "",
    description: "",
    description_en: "",
    price: "",
    interval: "month" as "month" | "year",
    features: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/subscription-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: storeId,
        name: form.name,
        name_en: form.name_en || null,
        description: form.description || null,
        description_en: form.description_en || null,
        price: Number(form.price),
        interval: form.interval,
        features: form.features
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
      }),
    });

    if (res.ok) {
      const { plan } = await res.json();
      setLocalPlans((prev) => [...prev, plan]);
      setShowForm(false);
      setForm({ name: "", name_en: "", description: "", description_en: "", price: "", interval: "month", features: "" });
    }
    setSaving(false);
  }

  async function toggleActive(planId: string, isActive: boolean) {
    const plan = localPlans.find((p) => p.id === planId);
    if (!isActive && !plan?.stripe_price_id) {
      alert("Stripe Price IDが設定されていないため公開できません。一度削除して新しく作成してください。");
      return;
    }
    const res = await fetch(`/api/subscription-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });

    if (res.ok) {
      setLocalPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, is_active: !isActive } : p))
      );
    }
  }

  async function handleDelete(planId: string) {
    if (!confirm("このプランを削除しますか？")) return;
    const res = await fetch(`/api/subscription-plans/${planId}`, { method: "DELETE" });
    if (res.ok) {
      setLocalPlans((prev) => prev.filter((p) => p.id !== planId));
    }
  }

  return (
    <div>
      {!canAcceptPayments && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
          ⚠️ プランを有効にするには先にStripe連携が必要です。
        </div>
      )}

      {localPlans.length > 0 && (
        <div className="space-y-3 mb-4">
          {localPlans.map((plan) => (
            <div
              key={plan.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                plan.is_active ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-60"
              }`}
            >
              <div>
                <p className="font-medium">{plan.name}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(plan.price)}/{plan.interval === "month" ? "月" : "年"}
                  {!plan.stripe_price_id && (
                    <span className="ml-2 text-amber-500 text-xs">（Stripe Price ID未設定）</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    plan.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {plan.is_active ? "公開中" : "非公開"}
                </span>
                <button
                  onClick={() => toggleActive(plan.id, plan.is_active)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {plan.is_active ? "非公開にする" : "公開する"}
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <form onSubmit={handleCreate} className="border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-medium">新しいプランを作成</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">プラン名（日本語）</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="月額スタンダード"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name (English)</label>
              <input
                type="text"
                value={form.name_en}
                onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Monthly Standard"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">料金（円）</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
                min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2980"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">請求サイクル</label>
              <select
                value={form.interval}
                onChange={(e) =>
                  setForm((f) => ({ ...f, interval: e.target.value as "month" | "year" }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="month">月額</option>
                <option value="year">年額</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明（日本語・任意）</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="基本的なサービスが利用できるプランです"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
              <input
                type="text"
                value={form.description_en}
                onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A plan for basic services"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              特典（1行1項目）
            </label>
            <textarea
              value={form.features}
              onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={"優先予約\n10%割引\n月1回の無料サービス"}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "作成中..." : "プランを作成"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
          <p className="text-xs text-gray-400">
            ※ 作成後、Stripe ダッシュボードで Price ID を設定してください
          </p>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="border border-dashed border-gray-300 rounded-xl p-4 w-full text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm"
        >
          + 新しいプランを作成
        </button>
      )}
    </div>
  );
}
