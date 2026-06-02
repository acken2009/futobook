"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reservationId: string;
  currentStatus: string;
  currentReservedAt?: string;
}

const ACTIONS: Record<string, { label: string; next: string; className: string }[]> = {
  pending: [
    { label: "確定", next: "confirmed", className: "bg-green-600 hover:bg-green-700 text-white" },
    { label: "キャンセル", next: "cancelled", className: "bg-gray-200 hover:bg-gray-300 text-gray-700" },
  ],
  confirmed: [
    { label: "完了", next: "completed", className: "bg-blue-600 hover:bg-blue-700 text-white" },
    { label: "無断キャンセル", next: "no_show", className: "bg-red-100 hover:bg-red-200 text-red-700" },
    { label: "キャンセル", next: "cancelled", className: "bg-gray-200 hover:bg-gray-300 text-gray-700" },
  ],
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "確定",
  cancelled: "キャンセル",
  completed: "完了",
  no_show: "無断キャンセル",
};

export function ReservationActions({ reservationId, currentStatus, currentReservedAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const router = useRouter();

  const actions = ACTIONS[currentStatus];

  async function updateStatus(next: string) {
    if (!confirm(`ステータスを「${STATUS_LABEL[next] ?? next}」に変更しますか？`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error ?? "更新に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate || !newTime) return;
    setRescheduleError(null);
    setLoading(true);

    const reserved_at = new Date(`${newDate}T${newTime}:00`).toISOString();

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reserved_at }),
      });
      if (res.ok) {
        setShowReschedule(false);
        router.refresh();
      } else {
        const d = await res.json();
        setRescheduleError(d.error ?? "変更に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  }

  function openReschedule() {
    if (currentReservedAt) {
      const d = new Date(currentReservedAt);
      setNewDate(d.toLocaleDateString("sv-SE")); // YYYY-MM-DD
      setNewTime(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
    }
    setRescheduleError(null);
    setShowReschedule(true);
  }

  const canReschedule = currentStatus === "pending" || currentStatus === "confirmed";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {actions?.map((action) => (
          <button
            key={action.next}
            disabled={loading}
            onClick={() => updateStatus(action.next)}
            className={`text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-50 ${action.className}`}
          >
            {action.label}
          </button>
        ))}
        {canReschedule && (
          <button
            disabled={loading}
            onClick={openReschedule}
            className="text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-50 bg-purple-100 hover:bg-purple-200 text-purple-700"
          >
            日時変更
          </button>
        )}
      </div>

      {/* 日時変更フォーム */}
      {showReschedule && (
        <form
          onSubmit={handleReschedule}
          className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2"
        >
          <p className="text-xs font-medium text-purple-800">新しい日時を選択</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="date"
              min={today}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              required
              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          {rescheduleError && (
            <p className="text-xs text-red-600">{rescheduleError}</p>
          )}
          <div className="flex gap-1">
            <button
              type="submit"
              disabled={loading || !newDate || !newTime}
              className="text-xs px-3 py-1 rounded font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "変更中..." : "変更する"}
            </button>
            <button
              type="button"
              onClick={() => setShowReschedule(false)}
              className="text-xs px-3 py-1 rounded font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
