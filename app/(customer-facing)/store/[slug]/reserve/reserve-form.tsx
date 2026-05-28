"use client";

import { useState } from "react";
import { addDays, format, isSameDay, setHours, setMinutes } from "date-fns";
import { ja, enUS } from "date-fns/locale";

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
  bookedSlots?: string[];
  lang?: "ja" | "en";
}

type Step = "select-service" | "select-datetime" | "enter-info" | "done";

export function ReserveForm({ store, services, settings, schedules, primaryColor, bookedSlots = [], lang = "ja" }: Props) {
  const isEn = lang === "en";
  const locale = isEn ? enUS : ja;

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

  // Translation helpers
  const t = {
    selectService: isEn ? "① Select Service" : "① サービスを選択",
    optional: isEn ? "(optional)" : "（任意）",
    selectDatetime: isEn ? "② Select Date & Time" : "② 日時を選択",
    selectDatetimeFirst: isEn ? "① Select Date & Time" : "① 日時を選択",
    date: isEn ? "Date" : "日付",
    time: isEn ? "Time" : "時間",
    customerInfo: isEn ? "③ Your Details" : "③ お客様情報",
    customerInfoFirst: isEn ? "② Your Details" : "② お客様情報",
    name: isEn ? "Full Name" : "お名前",
    email: isEn ? "Email" : "メールアドレス",
    phone: isEn ? "Phone" : "電話番号",
    guests: isEn ? "Guests" : "人数",
    notes: isEn ? "Notes / Requests" : "ご要望・備考",
    namePlaceholder: isEn ? "John Smith" : "田中 太郎",
    emailPlaceholder: isEn ? "john@example.com" : "tanaka@example.com",
    phonePlaceholder: isEn ? "+1 234-567-8901" : "090-1234-5678",
    notesPlaceholder: isEn ? "Any special requests or allergies..." : "アレルギーや特別なご要望があればご記入ください",
    confirm: isEn ? "Booking Summary" : "予約内容の確認",
    price: isEn ? "Amount" : "料金",
    creditCard: isEn ? "(credit card on next page)" : "（次のページでクレジットカード決済）",
    submit: isEn ? "Confirm Booking" : "予約を確定する",
    submitPay: (amount: string) => isEn ? `Pay ${amount} & Book` : `${amount} を支払って予約する`,
    processing: isEn ? "Processing..." : "処理中...",
    free: isEn ? "Free" : "無料",
    min: isEn ? "min" : "分",
    person: (n: number) => isEn ? `${n} ${n === 1 ? "guest" : "guests"}` : `${n}名`,
    doneTitle: isEn ? "Booking Confirmed!" : "予約が完了しました！",
    doneBody: (n: string) => isEn ? `We received your booking, ${n}.` : `${n} 様の予約を受け付けました。`,
    doneMail: (e: string) => isEn ? `A confirmation email was sent to ${e}.` : `確認メールを ${e} に送信しました。`,
    backToStore: isEn ? "Back to Store" : "店舗ページに戻る",
    errorDefault: isEn ? "Booking failed. Please try again." : "予約に失敗しました",
    errorCheckout: isEn ? "Failed to redirect to payment. Please try again." : "決済画面への移動に失敗しました。もう一度お試しください。",
  };

  const availableDates = Array.from({ length: advanceDays }, (_, i) =>
    addDays(new Date(), i + 1)
  ).filter((date) => {
    const dow = date.getDay();
    const schedule = schedules.find((s) => s.day_of_week === dow);
    if (!schedule || schedule.is_closed) return false;
    return getTimeSlots(date).length > 0;
  });

  function getTimeSlots(date: Date): string[] {
    const dow = date.getDay();
    const schedule = schedules.find((s) => s.day_of_week === dow);
    if (!schedule || schedule.is_closed) return [];

    const [openH, openM] = schedule.open_time.split(":").map(Number);
    const [closeH, closeM] = schedule.close_time.split(":").map(Number);

    const bookedTimesForDate = new Set(
      bookedSlots
        .filter((iso) => {
          const d = new Date(iso);
          return (
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate()
          );
        })
        .map((iso) => {
          const d = new Date(iso);
          return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        })
    );

    const slots: string[] = [];
    let current = openH * 60 + openM;
    const end = closeH * 60 + closeM;

    while (current + slotMinutes <= end) {
      const h = Math.floor(current / 60).toString().padStart(2, "0");
      const m = (current % 60).toString().padStart(2, "0");
      const timeStr = `${h}:${m}`;
      if (!bookedTimesForDate.has(timeStr)) {
        slots.push(timeStr);
      }
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
      setError(data.error ?? t.errorDefault);
      setLoading(false);
      return;
    }

    const { reservation } = await res.json();

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
        const errData = await checkoutRes.json().catch(() => ({}));
        setError(errData.error ?? t.errorCheckout);
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
        <h2 className="text-2xl font-bold mb-2">{t.doneTitle}</h2>
        <p className="text-gray-600 mb-1">{t.doneBody(name)}</p>
        <p className="text-gray-600 mb-6">{t.doneMail(email)}</p>
        <a
          href={`/store/${store.slug}${isEn ? "?lang=en" : ""}`}
          className="inline-block text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          style={{ backgroundColor: primaryColor }}
        >
          {t.backToStore}
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
            <h2 className="font-semibold">{t.selectService}</h2>
            <span className="text-xs text-gray-400">{t.optional}</span>
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
                    <p className="text-xs text-gray-500">{s.duration_minutes}{t.min}</p>
                  )}
                </div>
                <span className="font-semibold" style={{ color: primaryColor }}>
                  {s.price ? `¥${s.price.toLocaleString()}` : t.free}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: 日時選択 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-4">
          {services.length > 0 ? t.selectDatetime : t.selectDatetimeFirst}
        </h2>

        {/* 日付 */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">{t.date}</p>
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
                <p className="text-xs opacity-70">{format(date, "M/d", { locale })}</p>
                <p className="font-medium">{format(date, "EEE", { locale })}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 時間スロット */}
        {selectedDate && (
          <div>
            <p className="text-sm text-gray-600 mb-2">{t.time}</p>
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
            {services.length > 0 ? t.customerInfo : t.customerInfoFirst}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.name} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.namePlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.email} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.emailPlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.phone}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.phonePlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.guests}
              </label>
              <select
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: maxParty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{t.person(n)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.notes}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.notesPlaceholder}
              />
            </div>
          </div>

          {/* 予約内容確認 */}
          <div className="bg-gray-50 rounded-lg p-4 my-4 text-sm">
            <p className="font-medium mb-1">{t.confirm}</p>
            <p className="text-gray-600">
              {isEn
                ? format(selectedDate, "MMMM d, yyyy (EEE)", { locale }) + " " + selectedTime
                : format(selectedDate, "yyyy年M月d日(EEE)", { locale }) + " " + selectedTime + "〜"}
            </p>
            {selectedService && (
              <p className="text-gray-600">{selectedService.name}</p>
            )}
            <p className="text-gray-600">{t.person(partySize)}</p>
            {selectedService?.price && selectedService.price > 0 && store.stripe_account_status === "active" && (
              <p className="font-semibold mt-2" style={{ color: primaryColor }}>
                {t.price}：¥{selectedService.price.toLocaleString()}{isEn ? " " : ""}
                <span className="font-normal text-gray-500">{t.creditCard}</span>
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
              ? t.processing
              : selectedService?.price && selectedService.price > 0 && store.stripe_account_status === "active"
              ? t.submitPay(`¥${selectedService.price.toLocaleString()}`)
              : t.submit}
          </button>
        </form>
      )}
    </div>
  );
}
