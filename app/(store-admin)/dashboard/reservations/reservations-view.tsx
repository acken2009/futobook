"use client";

import { useState } from "react";
import { ReservationActions } from "./reservation-actions";

type Reservation = {
  id: string;
  reserved_at: string;
  status: string;
  party_size: number;
  customers: { name: string; email: string; phone?: string } | null;
  service_items: { name: string; price: number | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "保留",
  confirmed: "確定",
  cancelled: "キャンセル",
  completed: "完了",
  no_show: "無断キャンセル",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-yellow-400",
  confirmed: "bg-green-500",
  cancelled: "bg-gray-300",
  completed: "bg-blue-400",
  no_show: "bg-red-400",
};

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── カレンダービュー ──────────────────────────────────────
function CalendarView({ reservations }: { reservations: Reservation[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // 月の最初の日の曜日と日数を計算
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 予約を日付文字列でグルーピング
  const byDate: Record<string, Reservation[]> = {};
  for (const r of reservations) {
    const d = new Date(r.reserved_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(r);
    }
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedReservations = selectedDate ? (byDate[selectedDate] ?? []) : [];

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
          ←
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {year}年{month + 1}月
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
          →
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-2 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-500"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="bg-gray-50 min-h-[80px]" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayReservations = byDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayOfWeek = (firstDay + day - 1) % 7;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`bg-white min-h-[80px] p-1.5 text-left hover:bg-blue-50 transition-colors ${
                isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : ""
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 text-sm rounded-full mb-1 font-medium ${
                  isToday
                    ? "bg-blue-600 text-white"
                    : dayOfWeek === 0
                    ? "text-red-400"
                    : dayOfWeek === 6
                    ? "text-blue-400"
                    : "text-gray-700"
                }`}
              >
                {day}
              </span>
              <div className="space-y-0.5">
                {dayReservations.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs truncate ${
                      STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span className="shrink-0">{formatTime(r.reserved_at)}</span>
                    <span className="truncate">{r.customers?.name ?? "—"}</span>
                  </div>
                ))}
                {dayReservations.length > 3 && (
                  <div className="text-xs text-gray-400 px-1">
                    +{dayReservations.length - 3}件
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 選択日の詳細 */}
      {selectedDate && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-800">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
                year: "numeric", month: "long", day: "numeric", weekday: "short",
              })}
              の予約 ({selectedReservations.length}件)
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
          </div>
          {selectedReservations.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">この日の予約はありません</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedReservations
                .sort((a, b) => a.reserved_at.localeCompare(b.reserved_at))
                .map((r) => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[r.status] ?? "bg-gray-300"}`} />
                      <div>
                        <p className="text-sm font-medium">
                          {formatTime(r.reserved_at)} — {r.customers?.name ?? "—"}
                          <span className="text-gray-400 font-normal ml-1">({r.party_size}名)</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {r.service_items?.name ?? "サービスなし"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      <ReservationActions reservationId={r.id} currentStatus={r.status} currentReservedAt={r.reserved_at} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── リストビュー ──────────────────────────────────────────
function ListView({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {["日時", "お客様", "サービス", "人数", "ステータス", "操作"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-sm font-medium text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reservations.length > 0 ? (
            reservations.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{formatDateTime(r.reserved_at)}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium">{r.customers?.name}</p>
                  <p className="text-xs text-gray-500">{r.customers?.email}</p>
                </td>
                <td className="px-4 py-3 text-sm">{r.service_items?.name ?? "-"}</td>
                <td className="px-4 py-3 text-sm">{r.party_size}名</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ReservationActions reservationId={r.id} currentStatus={r.status} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                予約がまだありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────────
export function ReservationsView({ reservations }: { reservations: Reservation[] }) {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">予約管理</h1>
          <p className="text-gray-500 mt-1">全 {reservations.length} 件</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "calendar" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📅 カレンダー
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📋 リスト
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <CalendarView reservations={reservations} />
      ) : (
        <ListView reservations={reservations} />
      )}
    </div>
  );
}
