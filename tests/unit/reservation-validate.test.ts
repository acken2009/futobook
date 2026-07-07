import { describe, it, expect } from "vitest";
import {
  validateReservationSlot,
  toJstParts,
  DEFAULT_SETTINGS,
  type AvailabilitySchedule,
  type AvailabilityOverride,
} from "@/lib/reservations/validate";

// 全曜日 10:00-18:00 営業のスケジュール
const allWeekSchedules: AvailabilitySchedule[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  open_time: "10:00",
  close_time: "18:00",
  is_closed: false,
}));

const settings = { slot_duration_minutes: 60, max_party_size: 4, advance_booking_days: 30 };

// 基準時刻: 2026-07-05 12:00 JST（= 03:00 UTC）日曜
const now = new Date("2026-07-05T03:00:00Z");

/** JSTの日時文字列からDateを作るヘルパー */
function jst(dateTime: string): Date {
  return new Date(`${dateTime}+09:00`);
}

function validate(reservedAt: Date, overrides: AvailabilityOverride[] = []) {
  return validateReservationSlot({
    reservedAt,
    now,
    settings,
    schedules: allWeekSchedules,
    overrides,
  });
}

describe("toJstParts", () => {
  it("UTC日時をJSTの日付・曜日・分に変換する", () => {
    // 2026-07-10 22:00 UTC = 2026-07-11 07:00 JST（土曜）
    const parts = toJstParts(new Date("2026-07-10T22:00:00Z"));
    expect(parts.dateStr).toBe("2026-07-11");
    expect(parts.dayOfWeek).toBe(6);
    expect(parts.minutesOfDay).toBe(7 * 60);
    expect(parts.hasSubMinute).toBe(false);
  });

  it("秒がある場合は hasSubMinute = true", () => {
    expect(toJstParts(new Date("2026-07-10T22:00:30Z")).hasSubMinute).toBe(true);
  });
});

describe("validateReservationSlot: 日時の基本チェック", () => {
  it("営業時間内の正しいスロットは有効", () => {
    expect(validate(jst("2026-07-06T10:00:00"))).toEqual({ ok: true });
    expect(validate(jst("2026-07-06T14:00:00"))).toEqual({ ok: true });
    expect(validate(jst("2026-07-06T17:00:00"))).toEqual({ ok: true }); // 最終枠（17:00-18:00）
  });

  it("過去の日時は拒否", () => {
    const result = validate(jst("2026-07-05T11:00:00")); // nowは12:00 JST
    expect(result.ok).toBe(false);
  });

  it("現在時刻ちょうども拒否", () => {
    expect(validate(jst("2026-07-05T12:00:00")).ok).toBe(false);
  });

  it("予約可能期間（30日+1日バッファ）を超えたら拒否", () => {
    expect(validate(jst("2026-08-10T14:00:00")).ok).toBe(false);
  });

  it("不正なDateは拒否", () => {
    expect(validate(new Date("invalid")).ok).toBe(false);
  });
});

describe("validateReservationSlot: 営業時間チェック", () => {
  it("開店前は拒否", () => {
    expect(validate(jst("2026-07-06T09:00:00")).ok).toBe(false);
  });

  it("枠の終了が閉店を超える場合は拒否（17:30開始で18:00閉店・60分枠）", () => {
    expect(validate(jst("2026-07-06T17:30:00")).ok).toBe(false);
  });

  it("スロットグリッドに合わない時間は拒否（10:30開始・60分枠）", () => {
    expect(validate(jst("2026-07-06T10:30:00")).ok).toBe(false);
  });

  it("秒を含む日時は拒否", () => {
    expect(validate(jst("2026-07-06T10:00:30")).ok).toBe(false);
  });

  it("定休日は拒否", () => {
    const schedules = allWeekSchedules.map((s) =>
      s.day_of_week === 1 ? { ...s, is_closed: true } : s
    );
    const result = validateReservationSlot({
      reservedAt: jst("2026-07-06T10:00:00"), // 月曜
      now,
      settings,
      schedules,
      overrides: [],
    });
    expect(result.ok).toBe(false);
  });

  it("スケジュール未設定の曜日は拒否", () => {
    const result = validateReservationSlot({
      reservedAt: jst("2026-07-06T10:00:00"),
      now,
      settings,
      schedules: [],
      overrides: [],
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateReservationSlot: 特別営業日（override）", () => {
  it("臨時休業日は拒否", () => {
    const overrides: AvailabilityOverride[] = [
      { date: "2026-07-06", is_closed: true, open_time: null, close_time: null },
    ];
    expect(validate(jst("2026-07-06T14:00:00"), overrides).ok).toBe(false);
  });

  it("特別営業時間が優先される（12:00-15:00のみ営業）", () => {
    const overrides: AvailabilityOverride[] = [
      { date: "2026-07-06", is_closed: false, open_time: "12:00", close_time: "15:00" },
    ];
    expect(validate(jst("2026-07-06T12:00:00"), overrides)).toEqual({ ok: true });
    expect(validate(jst("2026-07-06T10:00:00"), overrides).ok).toBe(false); // 通常なら営業時間
  });
});

describe("validateReservationSlot: JST日付境界", () => {
  it("UTCでは前日でもJSTの日付で判定される", () => {
    // 2026-07-06 10:00 JST = 2026-07-06 01:00 UTC → 月曜のスケジュール
    const schedules: AvailabilitySchedule[] = [
      { day_of_week: 1, open_time: "10:00", close_time: "18:00", is_closed: false },
    ];
    const result = validateReservationSlot({
      reservedAt: new Date("2026-07-06T01:00:00Z"),
      now,
      settings,
      schedules,
      overrides: [],
    });
    expect(result).toEqual({ ok: true });
  });
});

describe("validateReservationSlot: 30分スロット", () => {
  const halfHourSettings = { ...settings, slot_duration_minutes: 30 };

  it("30分刻みの枠が有効", () => {
    const result = validateReservationSlot({
      reservedAt: jst("2026-07-06T10:30:00"),
      now,
      settings: halfHourSettings,
      schedules: allWeekSchedules,
      overrides: [],
    });
    expect(result).toEqual({ ok: true });
  });

  it("17:30開始は有効（18:00閉店・30分枠）", () => {
    const result = validateReservationSlot({
      reservedAt: jst("2026-07-06T17:30:00"),
      now,
      settings: halfHourSettings,
      schedules: allWeekSchedules,
      overrides: [],
    });
    expect(result).toEqual({ ok: true });
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("settingsがnullでもデフォルト値で検証される", () => {
    const result = validateReservationSlot({
      reservedAt: jst("2026-07-06T10:00:00"),
      now,
      settings: null,
      schedules: allWeekSchedules,
      overrides: [],
    });
    expect(result).toEqual({ ok: true });
    expect(DEFAULT_SETTINGS.slot_duration_minutes).toBe(60);
  });
});
