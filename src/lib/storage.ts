import { STORAGE_KEYS } from "./constants";
import type { Location } from "../types";

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
}

export function loadStoredLocation(): Location | null {
  return readJson<Location>(STORAGE_KEYS.location);
}

export function saveStoredLocation(location: Location): void {
  writeJson(STORAGE_KEYS.location, location);
}

export function loadStoredPreciseLocation(): Location | null {
  return readJson<Location>(STORAGE_KEYS.preciseLocation);
}

export function saveStoredPreciseLocation(location: Location): void {
  writeJson(STORAGE_KEYS.preciseLocation, location);
}

export function loadStoredSelectedHour(): string | null {
  return window.localStorage.getItem(STORAGE_KEYS.selectedHour);
}

export function saveStoredSelectedHour(isoHour: string): void {
  window.localStorage.setItem(STORAGE_KEYS.selectedHour, isoHour);
}

export function loadStoredSelectedDay(): string | null {
  return window.localStorage.getItem(STORAGE_KEYS.selectedDay);
}

export function saveStoredSelectedDay(isoDay: string): void {
  window.localStorage.setItem(STORAGE_KEYS.selectedDay, isoDay);
}
