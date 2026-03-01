import type { TempBand } from "../types";

export const STORAGE_KEYS = {
  location: "weatherapp:v1:location",
  preciseLocation: "weatherapp:v2:preciseLocation",
  selectedHour: "weatherapp:v1:selectedHour",
  selectedDay: "weatherapp:v1:selectedDay",
} as const;

export const BAND_COLORS: Record<TempBand, string> = {
  subzero: "#94a3b8",
  freezing: "#93c5fd",
  mild: "#fde68a",
  hot: "#fdba74",
  superhot: "#fca5a5",
};
