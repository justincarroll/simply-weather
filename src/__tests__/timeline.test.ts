import { describe, expect, it } from "vitest";
import { buildDailySlots, buildHourlySlots } from "../lib/timeline";
import type { WeatherData } from "../types";

function buildFakeWeather(): WeatherData {
  const hourlyByTime: WeatherData["hourlyByTime"] = {};
  const dailyByDate: WeatherData["dailyByDate"] = {};

  for (let hour = 0; hour < 24; hour += 1) {
    const iso = `2026-02-28T${String(hour).padStart(2, "0")}:00`;
    hourlyByTime[iso] = { tempC: hour, weatherCode: 0 };
  }

  const dates = ["2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22", "2026-02-23", "2026-02-24", "2026-02-25", "2026-02-26", "2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"];

  dates.forEach((date, index) => {
    dailyByDate[date] = {
      tempMaxC: index,
      tempMinC: index - 5,
      weatherCode: 1,
    };
  });

  return {
    timezone: "America/New_York",
    currentHourIso: "2026-02-28T12:00",
    todayIso: "2026-02-28",
    hourlyByTime,
    dailyByDate,
  };
}

describe("timeline builders", () => {
  it("creates 24 hourly slots centered on current hour", () => {
    const weather = buildFakeWeather();
    const slots = buildHourlySlots(weather);

    expect(slots).toHaveLength(24);
    expect(slots[11].isoTime).toBe("2026-02-28T12:00");
    expect(slots[11].isCurrent).toBe(true);
    expect(slots.filter((slot) => slot.isPast)).toHaveLength(11);
  });

  it("creates 20 daily slots with today in position 10", () => {
    const weather = buildFakeWeather();
    const slots = buildDailySlots(weather);

    expect(slots).toHaveLength(20);
    expect(slots[9].isoDate).toBe("2026-02-28");
    expect(slots[9].isToday).toBe(true);
    expect(slots.filter((slot) => slot.isPast)).toHaveLength(9);
  });
});
