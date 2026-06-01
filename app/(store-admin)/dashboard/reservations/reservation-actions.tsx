"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reservationId: string;
  currentStatus: string;
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

export function ReservationActions({ reservationId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const actions = ACTIONS[currentStatus];
  if (!actions) return null;

  async function updateStatus(next: string) {
    if (!confirm(`ステータスを「${next === "confirmed" ? "確定" : next === "cancelled" ? "キャンセル" : next === "completed" ? "完了" : "無断キャンセル"}」に変更しますか？`)) return;
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

  return (
    <div className="flex gap-1 flex-wrap">
      {actions.map((action) => (
        <button
          key={action.next}
          disabled={loading}
          onClick={() => updateStatus(action.next)}
          className={`text-xs px-2 py-1 rounded font-medium transition-colors disabled:opacity-50 ${action.className}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
