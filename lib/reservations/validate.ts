/**
 * 予約日時のサーバー側バリデーション
 *
 * - クライアントの入力は信用せず、営業時間・スロット整合・予約可能期間をサーバーで検証する
 * - 店舗の営業時間はすべて日本時間（JST, UTC+9）基準。日本にDSTはないため固定オフセットで安全
 * - Stripe SDK / Supabase に依存しない純粋関数（単体テスト可能）
 */

export interface AvailabilitySchedule {
  day_of_week: number; // 0 = 日曜
  open_time: string;   // "HH:MM" or "HH:MM:SS"
  close_time: string;
  is_closed: boolean;
}

export interface AvailabilityOverride {
  date: string; // "YYYY-MM-DD"（JST）
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export interface ReservationSettings {
  slot_duration_minutes: number;
  max_party_size: number;
  advance_booking_days: number;
}

export const DEFAULT_SETTINGS: ReservationSettings = {
  slot_duration_minutes: 60,
  max_party_size: 4,
  advance_booking_days: 30,
};

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** DateをJSTの日付文字列・曜日・0時からの経過分に分解する */
export function toJstParts(date: Date): {
  dateStr: string;
  dayOfWeek: number;
  minutesOfDay: number;
  hasSubMinute: boolean;
} {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    dateStr: jst.toISOString().slice(0, 10),
    dayOfWeek: jst.getUTCDay(),
    minutesOfDay: jst.getUTCHours() * 60 + jst.getUTCMinutes(),
    hasSubMinute: jst.getUTCSeconds() !== 0 || jst.getUTCMilliseconds() !== 0,
  };
}

/** "HH:MM" / "HH:MM:SS" を0時からの経過分に変換する */
function timeToMinutes(time: string): number | null {
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return minutes <= 24 * 60 ? minutes : null;
}

export type SlotValidation = { ok: true } | { ok: false; reason: string };

/**
 * 予約日時が「営業時間内の正しいスロット」かを検証する
 */
export function validateReservationSlot(params: {
  reservedAt: Date;
  now?: Date;
  settings: ReservationSettings | null;
  schedules: AvailabilitySchedule[];
  overrides: AvailabilityOverride[];
}): SlotValidation {
  const { reservedAt, schedules, overrides } = params;
  const now = params.now ?? new Date();
  const settings = params.settings ?? DEFAULT_SETTINGS;

  if (isNaN(reservedAt.getTime())) {
    return { ok: false, reason: "日時の形式が正しくありません" };
  }

  if (reservedAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "過去の日時は予約できません" };
  }

  // 予約可能期間（advance_booking_days + タイムゾーン差の1日バッファ）
  const maxAheadMs = (settings.advance_booking_days + 1) * 24 * 60 * 60 * 1000;
  if (reservedAt.getTime() - now.getTime() > maxAheadMs) {
    return { ok: false, reason: "予約可能期間を超えています" };
  }

  const { dateStr, dayOfWeek, minutesOfDay, hasSubMinute } = toJstParts(reservedAt);

  if (hasSubMinute) {
    return { ok: false, reason: "予約枠に合致しない時間です" };
  }

  // その日の営業時間を解決（特別営業日 > 通常スケジュール）
  let openTime: string | null = null;
  let closeTime: string | null = null;

  const override = overrides.find((o) => o.date === dateStr);
  if (override) {
    if (override.is_closed || !override.open_time || !override.close_time) {
      return { ok: false, reason: "この日は営業していません" };
    }
    openTime = override.open_time;
    closeTime = override.close_time;
  } else {
    const schedule = schedules.find((s) => s.day_of_week === dayOfWeek);
    if (!schedule || schedule.is_closed) {
      return { ok: false, reason: "この日は営業していません" };
    }
    openTime = schedule.open_time;
    closeTime = schedule.close_time;
  }

  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  if (open === null || close === null) {
    return { ok: false, reason: "営業時間の設定が正しくありません" };
  }

  const slot = settings.slot_duration_minutes;
  if (
    minutesOfDay < open ||
    minutesOfDay + slot > close ||
    (minutesOfDay - open) % slot !== 0
  ) {
    return { ok: false, reason: "営業時間外または予約枠に合致しない時間です" };
  }

  return { ok: true };
}
