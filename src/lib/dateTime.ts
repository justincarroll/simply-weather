interface ZonedNowParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseIsoDate(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function parseIsoHour(isoHour: string): { year: number; month: number; day: number; hour: number } {
  const [date, hourPart] = isoHour.split("T");
  const { year, month, day } = parseIsoDate(date);
  return { year, month, day, hour: Number(hourPart.slice(0, 2)) };
}

export function formatIsoDate(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatIsoHour(parts: { year: number; month: number; day: number; hour: number }): string {
  return `${formatIsoDate(parts)}T${pad(parts.hour)}:00`;
}

export function getNowInTimezone(timezone: string, at: Date = new Date()): ZonedNowParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(at);

  const getPart = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
  };
}

export function getDateInTimezone(timezone: string, at: Date = new Date()): string {
  const parts = getNowInTimezone(timezone, at);
  return formatIsoDate(parts);
}

export function getHourInTimezone(timezone: string, at: Date = new Date()): string {
  const parts = getNowInTimezone(timezone, at);
  return formatIsoHour(parts);
}

export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);

  return formatIsoDate({
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  });
}

export function shiftIsoHour(isoHour: string, deltaHours: number): string {
  const { year, month, day, hour } = parseIsoHour(isoHour);
  const dt = new Date(Date.UTC(year, month - 1, day, hour));
  dt.setUTCHours(dt.getUTCHours() + deltaHours);

  return formatIsoHour({
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
    hour: dt.getUTCHours(),
  });
}

export function formatHourLabel(isoHour: string): string {
  const hour24 = Number(isoHour.slice(11, 13));
  const suffix = hour24 >= 12 ? "pm" : "am";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}${suffix}`;
}

export function formatDayLabel(isoDate: string, todayIso: string): string {
  if (isoDate === todayIso) return "Today";

  const { year, month, day } = parseIsoDate(isoDate);
  const dt = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(dt);
}
