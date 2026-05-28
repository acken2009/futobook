"use client";

import { useState } from "react";
import { addDays, format, isSameDay, setHours, setMinutes } from "date-fns";
import { ja } from "date-fns/locale";

interface Props {
  store: { id: string; name: string; slug: string; stripe_account_status?: string };
  services: Array<{ id: string; name: string; price: number | null; duration_minutes: number | null }>;
  settings: {
    slot_duration_minutes: number;
    max_party_size: number;
    advance_booking_days: number;
  } | null;
  schedules: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>;
  primaryColor: string;
}

type Step = "select-service" | "select-datetime" | "enter-info" | "done";

export function ReserveForm({ store, services, settings, schedules, primaryColor }: Props) {
  const [step, setStep] = useState<Step>(
    services.length > 0 ? "select-service" : "select-datetime"
  );
  const [selectedService, setSelectedService] = useState<Props["services"][0] | null>(
    services.length > 0 ? services[0] : null
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotMinutes = settings?.slot_duration_minutes ?? 60;
  const advanceDays = settings?.advance_booking_days ?? 30;
  const maxParty = settings?.max_party_size ?? 4;

  // 予約可能な日付一覧（今日〜advance_booking_days日後）
  const availableDates = Array.from({ length: advanceDays }, (_, i) =>
    addDays(new Date(), i + 1)
  ).filter((date) => {
    const dow = date.getDay();
    const schedule = schedules.find((s) => s.day_of_week === dow);
    return schedule && !schedule.is_closed;
  });

  // 選択した日の時間スロット一覧
  function getTimeSlots(date: Date): string[] {
    const dow = date.getDay();
    const schedule = schedules.find((s) => s.day_of_week === dow);
    if (!schedule || schedule.is_closed) return [];

    const [openH, openM] = schedule.open_time.split(":").map(Number);
    const [closeH, closeM] = schedule.close_time.split(":").map(Number);

    const slots: string[] = [];
    let current = openH * 60 + openM;
    const end = closeH * 60 + closeM;

    while (current + slotMinutes <= end) {
      const h = Math.floor(current / 60).toString().padStart(2, "0");
      const m = (current % 60).toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
      current += slotMinutes;
    }

    return slots;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setLoading(true);
    setError(null);

    const [h, m] = selectedTime.split(":").map(Number);
    const reservedAt = setMinutes(setHours(selectedDate, h), m).toISOString();
    const requiresPayment =
      selectedService?.price && store.stripe_account_status === "active";

    // 予約を作成
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_id: store.id,
        service_item_id: selectedService?.id ?? null,
        reserved_at: reservedAt,
        party_size: partySize,
        notes,
        customer: { name, email, phone },
        requires_payment: !!requiresPayment,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "予約に失敗しました");
      setLoading(false);
      return;
    }

    const { reservation } = await res.json();

    // 有料予約の場合はStripe Checkoutへリダイレクト
    if (requiresPayment && reservation) {
      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reservation",
          store_id: store.id,
          reservation_id: reservation.id,
        }),
      });

      if (checkoutRes.ok) {
        const { url } = await checkoutRes.json();
        window.location.href = url;
        return;
      } else {
        // checkout失敗 → エラー表示（予約はキャンセルしない）
        const errData = await checkoutRes.json().catch(() => ({}));
        setError(errData.error ?? "決済画面への移動に失敗しました。もう一度お試しください。");
        setLoading(false);
        return;
      }
    }

    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">予約が完了しました！</h2>
        <p className="text-gray-600 mb-1">
          {name} 様の予約を受け付けました。
        </p>
        <p className="text-gray-600 mb-6">
          確認メールを {email} に送信しました。
        </p>
        <a
          href={`/store/${store.slug}`}
          className="inline-block text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: primaryColor }}
        >
          店舗ページに戻る
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* STEP 1: サービス選択 */}
      {services.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">① サービスを選択</h2>
            <span className="text-xs text-gray-400">（任意）</span>
          </div>
          <div className="space-y-2">
            {services.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedService?.id === s.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="service"
                  value={s.id}
                  checked={selectedService?.id === s.id}
                  onChange={() => setSelectedService(s)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="font-medium">{s.name}</p>
                  {s.duration_minutes && (
                    <p className="text-xs text-gray-500">{s.duration_minutes}分</p>
                  )}
                </div>
                <span className="font-semibold" style={{ color: primaryColor }}>
                  {s.price ? `¥${s.price.toLocaleString()}` : "無料"}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: 日時選択 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">
          {services.length > 0 ? "② 日時を選択" : "① 日時を選択"}
        </h2>

        {/* 日付 */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">日付</p>
          <div className="grid grid-cols-4 gap-2">
            {availableDates.slice(0, 14).map((date) => (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                className={`text-center p-2 rounded-lg border text-sm transition-colors ${
                  selectedDate && isSameDay(selectedDate, date)
                    ? "text-white border-transparent"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                style={
                  selectedDate && isSameDay(selectedDate, date)
                    ? { backgroundColor: primaryColor }
                    : {}
                }
              >
                <p className="text-xs opacity-70">{format(date, "M/d", { locale: ja })}</p>
                <p className="font-medium">{format(date, "EEE", { locale: ja })}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 時間スロット */}
        {selectedDate && (
          <div>
            <p className="text-sm text-gray-600 mb-2">時間</p>
            <div className="grid grid-cols-4 gap-2">
              {getTimeSlots(selectedDate).map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedTime === time
                      ? "text-white border-transparent"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={
                    selectedTime === time ? { backgroundColor: primaryColor } : {}
                  }
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: 顧客情報 */}
      {selectedDate && selectedTime && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4">
            {services.length > 0 ? "③ お客様情報" : "② お客様情報"}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="田中 太郎"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tanaka@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                電話番号
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="090-1234-5678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                人数
              </label>
              <select
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}名</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ご要望・備考
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="アレルギーや特別なご要望があればご記入ください"
              />
            </div>
          </div>

          {/* 予約内容の確認 */}
          <div className="bg-gray-50 rounded-lg p-4 my-4 text-sm">
            <p className="font-medium mb-1">予約内容の確認</p>
            <p className="text-gray-600">
              {format(selectedDate, "yyyy年M月d日(EEE)", { locale: ja })} {selectedTime}〜
            </p>
            {selectedService && (
              <p className="text-gray-600">{selectedService.name}</p>
            )}
            <p className="text-gray-600">{partySize}名</p>
            {selectedService?.price && selectedService.price > 0 && store.stripe_account_status === "active" && (
              <p className="font-semibold mt-2" style={{ color: primaryColor }}>
                料金：¥{selectedService.price.toLocaleString()}（次のページでクレジットカード決済）
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            {loading
              ? "処理中..."
              : selectedService?.price && selectedService.price > 0 && store.stripe_account_status === "active"
              ? `¥${selectedService.price.toLocaleString()} を支払って予約する`
              : "予約を確定する"}
          </button>
        </form>
      )}
    </div>
  );
}
