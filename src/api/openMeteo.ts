import type { DailyPoint, HourlyPoint, Location, WeatherData } from "../types";
import { getDateInTimezone, getHourInTimezone, shiftIsoDate } from "../lib/dateTime";

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";
const GEOCODE_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const IP_WHOIS_ENDPOINT = "https://ipwho.is/";
const IP_INFO_ENDPOINT = "https://ipinfo.io/json";
const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

interface ForecastResponse {
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}

interface ArchiveResponse {
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
}

interface GeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    timezone?: string;
    country?: string;
    country_code?: string;
    admin1?: string;
  }>;
}

interface IpLookupResponse {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: {
    id?: string;
  };
}

interface IpInfoResponse {
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  timezone?: string;
}

interface NominatimReverseResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    postcode?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  display_name?: string;
}

function buildUrl(base: string, query: Record<string, string | number>): string {
  const url = new URL(base);

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

function normalizeUsState(admin1?: string): string | undefined {
  if (!admin1) return undefined;

  const trimmed = admin1.trim();
  if (!trimmed) return undefined;

  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }

  return US_STATE_ABBREVIATIONS[trimmed];
}

function formatLocationName(city: string, admin1?: string, countryCode?: string): string {
  const cleanCity = city.trim();
  const cleanRegion = admin1?.trim();
  const normalizedCountryCode = countryCode?.toUpperCase();

  if (normalizedCountryCode === "US") {
    const stateAbbr = normalizeUsState(cleanRegion);
    return stateAbbr ? `${cleanCity}, ${stateAbbr}` : cleanCity;
  }

  if (cleanRegion && cleanRegion.toLowerCase() !== cleanCity.toLowerCase()) {
    return `${cleanCity}, ${cleanRegion}`;
  }

  return cleanCity;
}

function isAdministrativeLocality(name: string): boolean {
  return /\b(township|municipality|county)\b/i.test(name);
}

function distanceSquared(latA: number, lonA: number, latB: number, lonB: number): number {
  const dLat = latA - latB;
  const dLon = lonA - lonB;
  return dLat * dLat + dLon * dLon;
}

async function resolveCityFromPostalCode(
  postalCode: string,
  latitude: number,
  longitude: number,
  countryCode?: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const response = await fetchJson<GeocodingResponse>(
    buildUrl(GEOCODE_ENDPOINT, {
      name: postalCode.trim(),
      count: 10,
      language: "en",
      format: "json",
    }),
    signal,
  );

  const normalizedCountryCode = countryCode?.toUpperCase();
  const candidates = (response.results ?? []).filter((result) => {
    if (!result.name?.trim()) return false;
    if (isAdministrativeLocality(result.name)) return false;
    if (normalizedCountryCode && result.country_code?.toUpperCase() !== normalizedCountryCode) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  const nearest = [...candidates].sort(
    (a, b) =>
      distanceSquared(a.latitude, a.longitude, latitude, longitude) -
      distanceSquared(b.latitude, b.longitude, latitude, longitude),
  )[0];

  return nearest?.name?.trim() ?? null;
}

function toHourlyRecord(source: ArchiveResponse["hourly"] | ForecastResponse["hourly"] | undefined): Record<string, HourlyPoint> {
  const record: Record<string, HourlyPoint> = {};
  if (!source) return record;

  const length = Math.min(source.time.length, source.temperature_2m.length, source.weather_code.length);

  for (let index = 0; index < length; index += 1) {
    const time = source.time[index];
    record[time] = {
      tempC: source.temperature_2m[index],
      weatherCode: source.weather_code[index],
    };
  }

  return record;
}

function toDailyRecord(source: ArchiveResponse["daily"] | ForecastResponse["daily"] | undefined): Record<string, DailyPoint> {
  const record: Record<string, DailyPoint> = {};
  if (!source) return record;

  const length = Math.min(
    source.time.length,
    source.temperature_2m_max.length,
    source.temperature_2m_min.length,
    source.weather_code.length,
  );

  for (let index = 0; index < length; index += 1) {
    const date = source.time[index];
    record[date] = {
      tempMaxC: source.temperature_2m_max[index],
      tempMinC: source.temperature_2m_min[index],
      weatherCode: source.weather_code[index],
    };
  }

  return record;
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<Location[]> {
  const clean = query.trim();
  if (!clean) return [];

  const url = buildUrl(GEOCODE_ENDPOINT, {
    name: clean,
    count: 7,
    language: "en",
    format: "json",
  });

  const response = await fetchJson<GeocodingResponse>(url, signal);

  return (response.results ?? []).map((result) => ({
    name: formatLocationName(
      result.name,
      result.admin1,
      result.country_code ?? (result.country?.toLowerCase().includes("united states") ? "US" : undefined),
    ),
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
    country: result.country,
    countryCode: result.country_code,
    admin1: result.admin1,
  }));
}

export async function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<Location | null> {
  const url = buildUrl(NOMINATIM_REVERSE_ENDPOINT, {
    lat: latitude,
    lon: longitude,
    format: "jsonv2",
    "accept-language": "en",
    addressdetails: 1,
  });

  try {
    const response = await fetchJson<NominatimReverseResponse>(url, signal);
    const address = response.address;
    if (!address) return null;

    let city =
      address.city ??
      address.town ??
      address.village ??
      address.hamlet;

    const countryCode = address.country_code?.toUpperCase();
    const needsPostalFallback = !city || isAdministrativeLocality(city);
    if (needsPostalFallback && address.postcode?.trim()) {
      const resolved = await resolveCityFromPostalCode(address.postcode, latitude, longitude, countryCode, signal);
      if (resolved) {
        city = resolved;
      }
    }

    if (!city || isAdministrativeLocality(city)) return null;

    return {
      name: formatLocationName(city, address.state, countryCode),
      latitude,
      longitude,
      country: address.country,
      countryCode,
      admin1: address.state,
    };
  } catch {
    return null;
  }
}

export async function lookupLocationByIp(signal?: AbortSignal): Promise<Location | null> {
  try {
    const response = await fetchJson<IpLookupResponse>(IP_WHOIS_ENDPOINT, signal);

    if (!response.success) {
      return null;
    }

    const latitude = response.latitude;
    const longitude = response.longitude;
    const city = response.city?.trim();

    if (latitude === undefined || longitude === undefined || !city) {
      return null;
    }

    return {
      name: formatLocationName(city, response.region, response.country_code),
      latitude,
      longitude,
      timezone: response.timezone?.id,
      country: response.country,
      countryCode: response.country_code,
      admin1: response.region,
    };
  } catch {
    // Try a second provider before giving up.
  }

  try {
    const response = await fetchJson<IpInfoResponse>(IP_INFO_ENDPOINT, signal);
    const city = response.city?.trim();
    const region = response.region?.trim();
    const countryCode = response.country?.toUpperCase();
    const locParts = response.loc?.split(",") ?? [];
    const latitude = Number(locParts[0]);
    const longitude = Number(locParts[1]);

    if (!city || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    return {
      name: formatLocationName(city, region, countryCode),
      latitude,
      longitude,
      timezone: response.timezone,
      countryCode,
      admin1: region,
    };
  } catch {
    return null;
  }
}

export async function fetchWeather(latitude: number, longitude: number, signal?: AbortSignal): Promise<WeatherData> {
  const forecastUrl = buildUrl(FORECAST_ENDPOINT, {
    latitude,
    longitude,
    hourly: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,weather_code",
    temperature_unit: "celsius",
    timezone: "auto",
    forecast_days: 11,
  });

  const forecast = await fetchJson<ForecastResponse>(forecastUrl, signal);
  const timezone = forecast.timezone || "UTC";
  const todayIso = getDateInTimezone(timezone);
  const currentHourIso = getHourInTimezone(timezone);

  const archiveStart = shiftIsoDate(todayIso, -9);
  const archiveEnd = shiftIsoDate(todayIso, -1);

  let archive: ArchiveResponse | null = null;
  try {
    const archiveUrl = buildUrl(ARCHIVE_ENDPOINT, {
      latitude,
      longitude,
      start_date: archiveStart,
      end_date: archiveEnd,
      hourly: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,weather_code",
      temperature_unit: "celsius",
      timezone,
    });

    archive = await fetchJson<ArchiveResponse>(archiveUrl, signal);
  } catch {
    archive = null;
  }

  return {
    timezone,
    currentHourIso,
    todayIso,
    hourlyByTime: {
      ...toHourlyRecord(archive?.hourly),
      ...toHourlyRecord(forecast.hourly),
    },
    dailyByDate: {
      ...toDailyRecord(archive?.daily),
      ...toDailyRecord(forecast.daily),
    },
  };
}
