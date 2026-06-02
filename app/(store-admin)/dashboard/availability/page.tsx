"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

type Schedule = {
  id?: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

type ReservationSettings = {
  id?: string;
  slot_duration_minutes: number;
  max_party_size: number;
  advance_booking_days: number;
  cancellation_hours: number;
  requires_payment: boolean;
};

type Override = {
  id: string;
  date: string;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  note: string | null;
};

const EMPTY_OVERRIDE_FORM = {
  date: "",
  is_closed: true,
  open_time: "09:00",
  close_time: "18:00",
  note: "",
};

export default function AvailabilityPage() {
  const supabase = createClient();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>(
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      open_time: "09:00",
      close_time: "18:00",
      is_closed: i === 0 || i === 6,
    }))
  );
  const [settings, setSettings] = useState<ReservationSettings>({
    slot_duration_minutes: 60,
    max_party_size: 4,
    advance_booking_days: 30,
    cancellation_hours: 24,
    requires_payment: false,
  });
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideForm, setOverrideForm] = useState(EMPTY_OVERRIDE_FORM);
  const [savingOverride, setSavingOverride] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (!store) return;
      setStoreId(store.id);

      const { data: existingSchedules } = await supabase
        .from("availability_schedules")
        .select("*")
        .eq("store_id", store.id)
        .order("day_of_week");

      if (existingSchedules && existingSchedules.length > 0) {
        setSchedules(
          Array.from({ length: 7 }, (_, i) => {
            const found = existingSchedules.find((s) => s.day_of_week === i);
            return found
              ? {
                  id: found.id,
                  day_of_week: i,
                  open_time: found.open_time.slice(0, 5),
                  close_time: found.close_time.slice(0, 5),
                  is_closed: found.is_closed,
                }
              : {
                  day_of_week: i,
                  open_time: "09:00",
                  close_time: "18:00",
                  is_closed: false,
                };
          })
        );
      }

      const { data: existingSettings } = await supabase
        .from("reservation_settings")
        .select("*")
        .eq("store_id", store.id)
        .single();

      if (existingSettings) {
        setSettings({
          id: existingSettings.id,
          slot_duration_minutes: existingSettings.slot_duration_minutes,
          max_party_size: existingSettings.max_party_size,
          advance_booking_days: existingSettings.advance_booking_days,
          cancellation_hours: existingSettings.cancellation_hours,
          requires_payment: existingSettings.requires_payment,
        });
      }

      const { data: existingOverrides } = await supabase
        .from("availability_overrides")
        .select("*")
        .eq("store_id", store.id)
        .order("date");

      if (existingOverrides) {
        setOverrides(existingOverrides);
      }

      setLoading(false);
    }
    load();
  }, []);

  const updateSchedule = (day: number, field: keyof Schedule, value: string | boolean) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === day ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    if (!storeId) return;
    setSaving(true);

    const scheduleData = schedules.map((s) => ({
      ...(s.id ? { id: s.id } : {}),
      store_id: storeId,
      day_of_week: s.day_of_week,
      open_time: s.open_time,
      close_time: s.close_time,
      is_closed: s.is_closed,
    }));

    await supabase
      .from("availability_schedules")
      .upsert(scheduleData, { onConflict: "store_id,day_of_week" });

    await supabase.from("reservation_settings").upsert(
      {
        ...(settings.id ? { id: settings.id } : {}),
        store_id: storeId,
        slot_duration_minutes: settings.slot_duration_minutes,
        max_party_size: settings.max_party_size,
        advance_booking_days: settings.advance_booking_days,
        cancellation_hours: settings.cancellation_hours,
        requires_payment: settings.requires_payment,
      },
      { onConflict: "store_id" }
    );

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddOverride = async () => {
    if (!storeId || !overrideForm.date) return;
    setSavingOverride(true);

    const { data, error } = await supabase
      .from("availability_overrides")
      .upsert(
        {
          store_id: storeId,
          date: overrideForm.date,
          is_closed: overrideForm.is_closed,
          open_time: overrideForm.is_closed ? null : overrideForm.open_time,
          close_time: overrideForm.is_closed ? null : overrideForm.close_time,
          note: overrideForm.note || null,
        },
        { onConflict: "store_id,date" }
      )
      .select()
      .single();

    if (!error && data) {
      setOverrides((prev) => {
        const filtered = prev.filter((o) => o.date !== data.date);
        return [...filtered, data].sort((a, b) => a.date.localeCompare(b.date));
      });
      setOverrideForm(EMPTY_OVERRIDE_FORM);
      setShowOverrideForm(false);
    }
    setSavingOverride(false);
  };

  const handleDeleteOverride = async (id: string) => {
    await supabase.from("availability_overrides").delete().eq("id", id);
    setOverrides((prev) => prev.filter((o) => o.id !== id));
  };

  const formatOverrideDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">営業時間・枠設定</h1>
      <p className="text-gray-500 mb-8">予約を受け付ける曜日・時間帯と予約ルールを設定します。</p>

      {/* 曜日別営業時間 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📅 曜日別営業時間</h2>
        <div className="space-y-3">
          {schedules.map((s) => (
            <div key={s.day_of_week} className="flex items-center gap-4">
              <span className="w-8 text-center font-medium text-gray-700">
                {DAY_NAMES[s.day_of_week]}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!s.is_closed}
                  onChange={(e) => updateSchedule(s.day_of_week, "is_closed", !e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-600">営業</span>
              </label>
              {!s.is_closed ? (
                <>
                  <input
                    type="time"
                    value={s.open_time}
                    onChange={(e) => updateSchedule(s.day_of_week, "open_time", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">〜</span>
                  <input
                    type="time"
                    value={s.close_time}
                    onChange={(e) => updateSchedule(s.day_of_week, "close_time", e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              ) : (
                <span className="text-sm text-gray-400 italic">定休日</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 特定日の例外設定 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">🗓️ 特定日の例外設定</h2>
            <p className="text-sm text-gray-500 mt-0.5">祝日・夏季休業など、特定の日の営業時間を設定します</p>
          </div>
          {!showOverrideForm && (
            <button
              onClick={() => setShowOverrideForm(true)}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 日付を追加
            </button>
          )}
        </div>

        {/* 追加フォーム */}
        {showOverrideForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                <input
                  type="date"
                  min={today}
                  value={overrideForm.date}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, date: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideForm.is_closed}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, is_closed: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">この日は休業</span>
              </label>

              {!overrideForm.is_closed && (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={overrideForm.open_time}
                    onChange={(e) => setOverrideForm((p) => ({ ...p, open_time: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">〜</span>
                  <input
                    type="time"
                    value={overrideForm.close_time}
                    onChange={(e) => setOverrideForm((p) => ({ ...p, close_time: e.target.value }))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
                <input
                  type="text"
                  placeholder="例: 夏季休業、祝日 など"
                  value={overrideForm.note}
                  onChange={(e) => setOverrideForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddOverride}
                  disabled={savingOverride || !overrideForm.date}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingOverride ? "保存中..." : "保存する"}
                </button>
                <button
                  onClick={() => {
                    setShowOverrideForm(false);
                    setOverrideForm(EMPTY_OVERRIDE_FORM);
                  }}
                  className="text-gray-600 px-4 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 例外一覧 */}
        {overrides.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">例外設定はありません</p>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div
                key={o.id}
                className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm ${
                  o.date < today ? "opacity-50" : ""
                } ${o.is_closed ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${o.is_closed ? "text-red-700" : "text-green-700"}`}>
                    {o.is_closed ? "休業" : "特別営業"}
                  </span>
                  <span className="text-gray-700">{formatOverrideDate(o.date)}</span>
                  {!o.is_closed && o.open_time && o.close_time && (
                    <span className="text-gray-500">
                      {o.open_time.slice(0, 5)} 〜 {o.close_time.slice(0, 5)}
                    </span>
                  )}
                  {o.note && (
                    <span className="text-gray-400 text-xs">({o.note})</span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteOverride(o.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 予約設定 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">⚙️ 予約ルール</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              予約枠の長さ（分）
            </label>
            <select
              value={settings.slot_duration_minutes}
              onChange={(e) =>
                setSettings((p) => ({ ...p, slot_duration_minutes: Number(e.target.value) }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[30, 60, 90, 120].map((m) => (
                <option key={m} value={m}>{m}分</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大人数
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.max_party_size}
              onChange={(e) =>
                setSettings((p) => ({ ...p, max_party_size: Number(e.target.value) }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              何日前まで予約可能
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={settings.advance_booking_days}
              onChange={(e) =>
                setSettings((p) => ({ ...p, advance_booking_days: Number(e.target.value) }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">日前まで</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キャンセル可能期限
            </label>
            <input
              type="number"
              min={0}
              max={168}
              value={settings.cancellation_hours}
              onChange={(e) =>
                setSettings((p) => ({ ...p, cancellation_hours: Number(e.target.value) }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">時間前まで</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.requires_payment}
              onChange={(e) =>
                setSettings((p) => ({ ...p, requires_payment: e.target.checked }))
              }
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">予約時に決済を必須にする</span>
              <p className="text-xs text-gray-400">有効にするとStripe連携が必要です</p>
            </div>
          </label>
        </div>
      </section>

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "保存中..." : saved ? "✅ 保存しました！" : "設定を保存する"}
      </button>
    </div>
  );
}
