export type Unit = "fahrenheit" | "celsius";

export type TempBand = "subzero" | "freezing" | "mild" | "hot" | "superhot";

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  countryCode?: string;
  admin1?: string;
}

export interface HourlyPoint {
  tempC: number;
  weatherCode: number;
}

export interface DailyPoint {
  tempMaxC: number;
  tempMinC: number;
  weatherCode: number;
}

export interface WeatherData {
  timezone: string;
  currentHourIso: string;
  todayIso: string;
  hourlyByTime: Record<string, HourlyPoint>;
  dailyByDate: Record<string, DailyPoint>;
}

export interface HourlySlot {
  isoTime: string;
  tempC: number | null;
  weatherCode: number | null;
  isPast: boolean;
  isCurrent: boolean;
}

export interface DailySlot {
  isoDate: string;
  tempMaxC: number | null;
  tempMinC: number | null;
  weatherCode: number | null;
  isPast: boolean;
  isToday: boolean;
}
