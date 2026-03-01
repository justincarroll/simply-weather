import type { TempBand, Unit } from "../types";

export function celsiusToFahrenheit(valueC: number): number {
  return valueC * 1.8 + 32;
}

export function fahrenheitToCelsius(valueF: number): number {
  return (valueF - 32) / 1.8;
}

export function getBandFromFahrenheit(valueF: number): TempBand {
  if (valueF < 0) return "subzero";
  if (valueF <= 55) return "freezing";
  if (valueF <= 74) return "mild";
  if (valueF <= 89) return "hot";
  return "superhot";
}

export function getBandFromCelsius(valueC: number): TempBand {
  return getBandFromFahrenheit(celsiusToFahrenheit(valueC));
}

const COLOR_STOPS_F: Array<{ tempF: number; color: string }> = [
  { tempF: -20, color: "#94a3b8" },
  { tempF: 0, color: "#8aa9cf" },
  { tempF: 20, color: "#88b6e6" },
  { tempF: 40, color: "#93c5fd" },
  { tempF: 55, color: "#ced8a8" },
  { tempF: 70, color: "#fde68a" },
  { tempF: 85, color: "#fdba74" },
  { tempF: 100, color: "#f6a0a7" },
  { tempF: 115, color: "#ee8f97" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  const value = Number.parseInt(expanded, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(red: number, green: number, blue: number): string {
  const toHex = (value: number): string => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function interpolateHexColor(from: string, to: string, ratio: number): string {
  const [fromR, fromG, fromB] = hexToRgb(from);
  const [toR, toG, toB] = hexToRgb(to);
  const t = clamp(ratio, 0, 1);

  return rgbToHex(fromR + (toR - fromR) * t, fromG + (toG - fromG) * t, fromB + (toB - fromB) * t);
}

export function getTemperatureColorFromFahrenheit(valueF: number): string {
  const min = COLOR_STOPS_F[0];
  const max = COLOR_STOPS_F[COLOR_STOPS_F.length - 1];
  const clamped = clamp(valueF, min.tempF, max.tempF);

  for (let index = 0; index < COLOR_STOPS_F.length - 1; index += 1) {
    const start = COLOR_STOPS_F[index];
    const end = COLOR_STOPS_F[index + 1];
    if (clamped > end.tempF) continue;

    const ratio = (clamped - start.tempF) / (end.tempF - start.tempF);
    return interpolateHexColor(start.color, end.color, ratio);
  }

  return max.color;
}

export function getTemperatureColorFromCelsius(valueC: number): string {
  return getTemperatureColorFromFahrenheit(celsiusToFahrenheit(valueC));
}

export function formatTemperature(valueC: number | null, unit: Unit): string {
  if (valueC === null || Number.isNaN(valueC)) return "--";

  const display = unit === "celsius" ? valueC : celsiusToFahrenheit(valueC);
  return `${Math.round(display)}°`;
}

export function detectPreferredUnit(): Unit {
  try {
    const locale = new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale);
    const region = locale.region?.toUpperCase();
    const fahrenheitRegions = new Set(["US", "BS", "BZ", "KY", "LR", "MM", "PW"]);
    return region && fahrenheitRegions.has(region) ? "fahrenheit" : "celsius";
  } catch {
    return "fahrenheit";
  }
}
