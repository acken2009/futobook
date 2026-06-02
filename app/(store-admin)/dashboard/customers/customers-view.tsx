"use client";

import { useState } from "react";

type Reservation = {
  id: string;
  reserved_at: string;
  status: string;
  service_items: { name: string } | null;
  party_size: number;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  internal_notes: string | null;
  created_at: string;
  reservations: Reservation[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "保留",
  confirmed: "確定",
  cancelled: "キャンセル",
  completed: "完了",
  no_show: "無断キャンセル",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-600",
  confirmed: "text-green-600",
  cancelled: "text-gray-400",
  completed: "text-blue-600",
  no_show: "text-red-500",
};

function NotesEditor({ customer }: { customer: Customer }) {
  const [notes, setNotes] = useState(customer.internal_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internal_notes: notes }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500">カルテメモ</span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            編集
          </button>
        )}
        {saved && <span className="text-xs text-green-600">✓ 保存しました</span>}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="施術内容・お客様の特記事項・アレルギーなど..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 items-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
            <button
              onClick={() => {
                setNotes(customer.internal_notes ?? "");
                setEditing(false);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <span className="text-xs text-gray-400 ml-auto">{notes.length}/2000</span>
          </div>
        </div>
      ) : (
        <p
          onClick={() => setEditing(true)}
          className={`text-sm rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors min-h-[38px] ${
            notes ? "text-gray-700 bg-gray-50" : "text-gray-400 italic bg-gray-50"
          }`}
        >
          {notes || "メモなし（クリックして編集）"}
        </p>
      )}
    </div>
  );
}

function CustomerCard({ customer }: { customer: Customer }) {
  const [expanded, setExpanded] = useState(false);

  const completedVisits = customer.reservations.filter(
    (r) => r.status === "completed"
  ).length;
  const lastVisit = customer.reservations
    .filter((r) => r.status === "completed")
    .sort((a, b) => b.reserved_at.localeCompare(a.reserved_at))[0];
  const nextReservation = customer.reservations
    .filter((r) => r.status === "confirmed" && r.reserved_at > new Date().toISOString())
    .sort((a, b) => a.reserved_at.localeCompare(b.reserved_at))[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* ヘッダー行 */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{customer.name}</p>
              <p className="text-xs text-gray-500 truncate">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0 text-right">
            <div>
              <p className="text-xs text-gray-400">来店回数</p>
              <p className="font-semibold text-gray-800">{completedVisits}回</p>
            </div>
            {lastVisit && (
              <div>
                <p className="text-xs text-gray-400">最終来店</p>
                <p className="text-sm text-gray-700">
                  {new Date(lastVisit.reserved_at).toLocaleDateString("ja-JP", {
                    month: "short", day: "numeric",
                  })}
                </p>
              </div>
            )}
            {nextReservation && (
              <div>
                <p className="text-xs text-gray-400">次回予約</p>
                <p className="text-sm text-green-600 font-medium">
                  {new Date(nextReservation.reserved_at).toLocaleDateString("ja-JP", {
                    month: "short", day: "numeric",
                  })}
                </p>
              </div>
            )}
            <span className="text-gray-400 text-sm">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
        {/* メモプレビュー（折りたたみ時） */}
        {!expanded && customer.internal_notes && (
          <p className="mt-2 text-xs text-gray-500 truncate pl-12">
            📝 {customer.internal_notes}
          </p>
        )}
      </button>

      {/* 展開時 */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-6 mt-4">
            {/* 左: 基本情報 + メモ */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">基本情報</h4>
              <div className="space-y-2 text-sm">
                {customer.phone && (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-16 shrink-0">電話</span>
                    <span className="text-gray-700">{customer.phone}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gray-400 w-16 shrink-0">登録日</span>
                  <span className="text-gray-700">
                    {new Date(customer.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>
              <NotesEditor customer={customer} />
            </div>

            {/* 右: 予約履歴 */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                予約履歴 ({customer.reservations.length}件)
              </h4>
              {customer.reservations.length === 0 ? (
                <p className="text-sm text-gray-400">予約履歴なし</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {customer.reservations
                    .sort((a, b) => b.reserved_at.localeCompare(a.reserved_at))
                    .map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-sm">
                        <span className={`text-xs font-medium w-20 shrink-0 ${STATUS_COLOR[r.status] ?? "text-gray-500"}`}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                        <span className="text-gray-600 shrink-0">
                          {new Date(r.reserved_at).toLocaleDateString("ja-JP", {
                            month: "short", day: "numeric",
                          })}
                        </span>
                        <span className="text-gray-400 truncate text-xs">
                          {r.service_items?.name ?? "—"} ({r.party_size}名)
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomersView({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState("");

  const filtered = customers.filter(
    (c) =>
      c.name.includes(search) ||
      c.email.includes(search) ||
      (c.phone ?? "").includes(search)
  );

  const totalVisits = customers.reduce(
    (sum, c) => sum + c.reservations.filter((r) => r.status === "completed").length,
    0
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
        <p className="text-gray-500 mt-1">
          {customers.length}名の顧客 · 累計来店 {totalVisits}回
        </p>
      </div>

      {/* 検索 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="名前・メール・電話番号で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {search ? "検索結果がありません" : "顧客データがまだありません"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  );
}
