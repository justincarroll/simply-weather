import type { DailySlot, HourlySlot, WeatherData } from "../types";
import { shiftIsoDate, shiftIsoHour } from "./dateTime";

export function buildHourlySlots(weather: WeatherData): HourlySlot[] {
  const slots: HourlySlot[] = [];

  for (let offset = -11; offset <= 12; offset += 1) {
    const isoTime = shiftIsoHour(weather.currentHourIso, offset);
    const point = weather.hourlyByTime[isoTime];

    slots.push({
      isoTime,
      tempC: point?.tempC ?? null,
      weatherCode: point?.weatherCode ?? null,
      isPast: offset < 0,
      isCurrent: offset === 0,
    });
  }

  return slots;
}

export function buildDailySlots(weather: WeatherData): DailySlot[] {
  const slots: DailySlot[] = [];

  for (let offset = -9; offset <= 10; offset += 1) {
    const isoDate = shiftIsoDate(weather.todayIso, offset);
    const point = weather.dailyByDate[isoDate];

    slots.push({
      isoDate,
      tempMaxC: point?.tempMaxC ?? null,
      tempMinC: point?.tempMinC ?? null,
      weatherCode: point?.weatherCode ?? null,
      isPast: offset < 0,
      isToday: offset === 0,
    });
  }

  return slots;
}

export function clampSelection<T extends string>(
  current: T | "",
  allowed: readonly T[],
  fallback: T,
): T {
  if (current && allowed.includes(current)) {
    return current;
  }

  return fallback;
}
