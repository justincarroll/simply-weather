/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchWeather, lookupLocationByIp, reverseGeocode, searchCities } from "./api/openMeteo";
import { SearchModal } from "./components/SearchModal";
import { NearMeIcon, MapIcon, WeatherIcon } from "./components/Icons";
import { TimelineRail, type TimelineRailItem } from "./components/TimelineRail";
import { STORAGE_KEYS } from "./lib/constants";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { formatDayLabel, formatHourLabel } from "./lib/dateTime";
import { getPreferredUnitForLocation } from "./lib/locationUnit";
import { loadStoredPreciseLocation, saveStoredPreciseLocation } from "./lib/storage";
import { buildDailySlots, buildHourlySlots, clampSelection } from "./lib/timeline";
import { formatTemperature, getTemperatureColorFromCelsius } from "./lib/temperature";
import type { Location } from "./types";

type LoadState = "locating" | "loading" | "ready" | "error";

function isValidLocation(value: unknown): value is Location {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Location>;
  return (
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.latitude === "number" &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === "number" &&
    Number.isFinite(candidate.longitude)
  );
}

function readSavedPreciseLocation(): Location | null {
  const stored = loadStoredPreciseLocation();
  return isValidLocation(stored) ? stored : null;
}

async function getGeolocationPermissionState(): Promise<PermissionState | null> {
  if (!("permissions" in navigator) || typeof navigator.permissions.query !== "function") {
    return null;
  }

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return null;
  }
}

async function resolveInitialLocation(): Promise<{ location: Location | null; message: string | null }> {
  const precise = readSavedPreciseLocation();
  if (precise) {
    return {
      location: precise,
      message: null,
    };
  }

  const approximate = await lookupLocationByIp();
  if (approximate) {
    return {
      location: approximate,
      message: null,
    };
  }

  return {
    location: null,
    message: "Could not detect location automatically. Use the map button to search.",
  };
}

function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: options?.timeout ?? 12000,
      maximumAge: options?.maximumAge ?? 0,
    });
  });
}

function getGeolocationErrorMessage(error: unknown): string {
  if (typeof GeolocationPositionError !== "undefined" && error instanceof GeolocationPositionError) {
    if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
      return "Location access was denied. Allow location permission to use Near Me.";
    }
    if (error.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
      return "Your location is currently unavailable.";
    }
    if (error.code === GeolocationPositionError.TIMEOUT) {
      return "Location lookup timed out. Try again.";
    }
  }

  return error instanceof Error ? error.message : "Unable to detect precise location.";
}

async function detectPreciseLocation(options?: PositionOptions): Promise<Location> {
  const position = await getCurrentPosition(options);
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  let reverse: Location | null = null;
  try {
    reverse = await reverseGeocode(latitude, longitude);
  } catch {
    reverse = null;
  }

  if (reverse) {
    return {
      ...reverse,
      latitude,
      longitude,
    };
  }

  return {
    name: "Current location",
    latitude,
    longitude,
  };
}

function isSameLocation(a: Location | null, b: Location | null): boolean {
  if (!a || !b) return false;
  return Math.abs(a.latitude - b.latitude) < 0.0001 && Math.abs(a.longitude - b.longitude) < 0.0001;
}

function isNightHourIso(isoTime: string): boolean {
  const hour = Number(isoTime.slice(11, 13));
  return Number.isFinite(hour) && (hour < 6 || hour >= 18);
}

export default function App(): React.JSX.Element {
  const [location, setLocation] = useState<Location | null>(null);
  const [weather, setWeather] = useState<Awaited<ReturnType<typeof fetchWeather>> | null>(null);
  const locationRef = useRef<Location | null>(null);

  const [selectedHourIso, setSelectedHourIso] = useState<string>("");
  const [selectedDayIso, setSelectedDayIso] = useState<string>("");

  const [loadState, setLoadState] = useState<LoadState>("locating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [recenterToken, setRecenterToken] = useState(0);
  const [weatherRefreshToken, setWeatherRefreshToken] = useState(0);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);
  const unit = useMemo(() => getPreferredUnitForLocation(location), [location]);
  const locationLatitude = location?.latitude;
  const locationLongitude = location?.longitude;

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.location);
      window.localStorage.removeItem(STORAGE_KEYS.selectedHour);
      window.localStorage.removeItem(STORAGE_KEYS.selectedDay);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setLoadState("locating");
    setErrorMessage(null);

    resolveInitialLocation().then((resolved) => {
      if (isCancelled) return;

      if (resolved.location) {
        setLocation(resolved.location);
        setLoadState("loading");
        setErrorMessage(resolved.message);
        return;
      }

      setLoadState("error");
      setErrorMessage(resolved.message);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function refreshPreciseLocationIfGranted(): Promise<void> {
      const permissionState = await getGeolocationPermissionState();
      if (isCancelled || permissionState !== "granted") return;

      try {
        const nextLocation = await detectPreciseLocation({
          timeout: 8000,
          maximumAge: 300000,
        });
        if (isCancelled) return;

        saveStoredPreciseLocation(nextLocation);
        const unchanged = isSameLocation(locationRef.current, nextLocation);
        if (unchanged) {
          setWeatherRefreshToken((value) => value + 1);
        } else {
          setLocation(nextLocation);
        }
      } catch {
        // Silently keep existing location if background precise refresh fails.
      }
    }

    void refreshPreciseLocationIfGranted();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (locationLatitude === undefined || locationLongitude === undefined) return;

    const controller = new AbortController();
    setLoadState("loading");

    fetchWeather(locationLatitude, locationLongitude, controller.signal)
      .then((nextWeather) => {
        if (controller.signal.aborted) return;

        setWeather(nextWeather);
        setSelectedHourIso(nextWeather.currentHourIso);
        setSelectedDayIso(nextWeather.todayIso);
        setRecenterToken((value) => value + 1);
        setLoadState("ready");
        setLocation((previous) => {
          if (!previous) return previous;
          if (previous.timezone === nextWeather.timezone) return previous;
          return { ...previous, timezone: nextWeather.timezone };
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setLoadState("error");
        setErrorMessage(error instanceof Error ? error.message : "Unable to load weather data.");
      });

    return () => {
      controller.abort();
    };
  }, [locationLatitude, locationLongitude, weatherRefreshToken]);

  useEffect(() => {
    if (!searchOpen) return;
    const clean = debouncedSearchQuery.trim();

    if (clean.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError(null);

    searchCities(clean, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        setSearchResults(results);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSearchError(error instanceof Error ? error.message : "Location search failed.");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setSearchLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedSearchQuery, searchOpen]);

  const hourlySlots = useMemo(() => (weather ? buildHourlySlots(weather) : []), [weather]);
  const dailySlots = useMemo(() => (weather ? buildDailySlots(weather) : []), [weather]);

  useEffect(() => {
    if (!weather) return;

    const hourIds = hourlySlots.map((slot) => slot.isoTime);
    const dayIds = dailySlots.map((slot) => slot.isoDate);

    const nextHour = clampSelection(selectedHourIso, hourIds, weather.currentHourIso);
    const nextDay = clampSelection(selectedDayIso, dayIds, weather.todayIso);

    if (nextHour !== selectedHourIso) {
      setSelectedHourIso(nextHour);
    }

    if (nextDay !== selectedDayIso) {
      setSelectedDayIso(nextDay);
    }
  }, [dailySlots, hourlySlots, selectedDayIso, selectedHourIso, weather]);

  const currentHourIso = weather?.currentHourIso;
  const todayIso = weather?.todayIso;
  const currentHour = useMemo(
    () => hourlySlots.find((slot) => slot.isoTime === currentHourIso) ?? null,
    [currentHourIso, hourlySlots],
  );
  const todaySlot = useMemo(() => dailySlots.find((slot) => slot.isoDate === todayIso) ?? null, [dailySlots, todayIso]);

  const activeTempC = currentHour?.tempC ?? todaySlot?.tempMaxC ?? 20;
  const bandColor = getTemperatureColorFromCelsius(activeTempC);

  const hourItems = useMemo<TimelineRailItem[]>(
    () =>
      hourlySlots.map((slot) => ({
        id: slot.isoTime,
        topLabel: formatHourLabel(slot.isoTime),
        temperatureLabel: formatTemperature(slot.tempC, unit),
        dimmed: slot.isPast,
        icon: <WeatherIcon code={slot.weatherCode} size={20} isNight={isNightHourIso(slot.isoTime)} />,
      })),
    [hourlySlots, unit],
  );

  const dayItems = useMemo<TimelineRailItem[]>(
    () =>
      dailySlots.map((slot) => ({
        id: slot.isoDate,
        topLabel: weather ? formatDayLabel(slot.isoDate, weather.todayIso) : slot.isoDate,
        temperatureLabel: formatTemperature(slot.tempMaxC, unit),
        dimmed: slot.isPast,
        icon: <WeatherIcon code={slot.weatherCode} size={28} />,
      })),
    [dailySlots, unit, weather],
  );

  const mainTemperature = formatTemperature(activeTempC, unit);
  const mainNumeric = mainTemperature === "--" ? "--" : mainTemperature.replace("°", "");

  const statusLabel =
    loadState === "locating" && !weather
      ? "Detecting your location..."
      : loadState === "loading"
        ? "Refreshing weather..."
        : loadState === "error"
          ? errorMessage ?? "Unable to load weather data."
          : "";

  const showStatusBanner = statusLabel.length > 0;

  const onReset = async () => {
    setErrorMessage(null);
    if (weather) {
      setSelectedHourIso(weather.currentHourIso);
      setSelectedDayIso(weather.todayIso);
    }
    setLoadState("locating");

    const applyResolvedLocation = (nextLocation: Location): void => {
      const unchanged = isSameLocation(locationRef.current, nextLocation);

      if (unchanged) {
        setWeatherRefreshToken((value) => value + 1);
      } else {
        setLocation(nextLocation);
      }
    };

    try {
      const nextLocation = await detectPreciseLocation();
      saveStoredPreciseLocation(nextLocation);
      applyResolvedLocation(nextLocation);
    } catch (error: unknown) {
      const preciseFallback = readSavedPreciseLocation();
      if (preciseFallback) {
        applyResolvedLocation(preciseFallback);
        setErrorMessage(getGeolocationErrorMessage(error));
      } else {
        const approximate = await lookupLocationByIp();
        if (approximate) {
          applyResolvedLocation(approximate);
          setErrorMessage(getGeolocationErrorMessage(error));
        } else {
          setErrorMessage(getGeolocationErrorMessage(error));
          if (weather) {
            setLoadState("ready");
          } else {
            setLoadState("error");
          }
        }
      }
    }
    setRecenterToken((value) => value + 1);
  };

  return (
    <div className="page-shell">
      <main className="weather-app" style={{ ["--band-color" as string]: bandColor }}>
        <div className="gradient-background" aria-hidden="true" />

        <div className="app-content">
          <header className="header">
            <div className="temp-stack" aria-live="polite">
              <p className="temp-number">{mainNumeric}</p>
              <p className="temp-degree">{mainNumeric === "--" ? "" : "°"}</p>
            </div>
            <p className="location-label">{location?.name ?? "Locating..."}</p>
          </header>

          <section className="body-content">
            <TimelineRail
              title="Hourly forecast"
              items={hourItems}
              selectedId={selectedHourIso}
              indicatorId={weather?.currentHourIso}
              onSelectionChange={(id) => setSelectedHourIso(id)}
              visibleCount={5}
              anchorIndex={2}
              widthClassName="hours-width"
              recenterToken={recenterToken}
              textSize="hour"
            />

            <TimelineRail
              title="Daily forecast"
              items={dayItems}
              selectedId={selectedDayIso}
              indicatorId={weather?.todayIso}
              onSelectionChange={(id) => setSelectedDayIso(id)}
              visibleCount={4}
              anchorIndex={1}
              widthClassName="days-width"
              recenterToken={recenterToken}
              textSize="day"
            />
          </section>

          <footer className="footer-menu">
            <button
              aria-label="Open location search"
              className="circle-button"
              onClick={() => {
                setSearchOpen(true);
                setSearchQuery("");
                setSearchResults([]);
                setSearchError(null);
              }}
              type="button"
            >
              <MapIcon />
            </button>

            <button aria-label="Reset to current location and now" className="circle-button" onClick={onReset} type="button">
              <NearMeIcon />
            </button>
          </footer>
        </div>

        <p className={`status-banner ${showStatusBanner ? "is-visible" : "is-hidden"}`} aria-live="polite">
          {showStatusBanner ? statusLabel : "\u00A0"}
        </p>

        <SearchModal
          open={searchOpen}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onClose={() => setSearchOpen(false)}
          onPickLocation={(nextLocation) => {
            setSearchOpen(false);
            setErrorMessage(null);
            setLocation(nextLocation);
          }}
          loading={searchLoading}
          error={searchError}
          results={searchResults}
        />
      </main>
    </div>
  );
}
