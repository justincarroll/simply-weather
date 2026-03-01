interface IconProps {
  size?: number;
}

function MaterialIcon({
  name,
  size = 24,
  outlined = false,
}: {
  name: string;
  size?: number;
  outlined?: boolean;
}): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={outlined ? "material-symbols-outlined" : "material-symbols-rounded"}
      style={{ fontSize: `${size}px` }}
    >
      {name}
    </span>
  );
}

export function MapIcon({ size = 24 }: IconProps): React.JSX.Element {
  return <MaterialIcon name="map" size={size} outlined />;
}

export function NearMeIcon({ size = 24 }: IconProps): React.JSX.Element {
  return <MaterialIcon name="near_me" size={size} outlined />;
}

export function CloseIcon({ size = 24 }: IconProps): React.JSX.Element {
  return <MaterialIcon name="close_small" size={size} />;
}

const WEATHER_ICON_BY_CODE: Record<number, string> = {
  0: "sunny",
  1: "sunny",
  2: "partly_cloudy_day",
  3: "cloud",
  45: "foggy",
  48: "foggy",
  51: "rainy",
  53: "rainy",
  55: "rainy",
  56: "rainy",
  57: "rainy",
  61: "rainy",
  63: "rainy",
  65: "rainy",
  66: "rainy",
  67: "rainy",
  71: "ac_unit",
  73: "ac_unit",
  75: "ac_unit",
  77: "grain",
  80: "rainy",
  81: "rainy",
  82: "rainy",
  85: "ac_unit",
  86: "ac_unit",
  95: "thunderstorm",
  96: "thunderstorm",
  99: "thunderstorm",
};

function getIconName(code: number | null, isNight: boolean): string {
  if (code === null) return "cloud";

  // Clear and mostly clear should not render as "sunny" overnight.
  if (isNight && (code === 0 || code === 1)) {
    return "dark_mode";
  }

  // Keep partly cloudy as a night-safe icon overnight.
  if (isNight && code === 2) {
    return "nightlight";
  }

  return WEATHER_ICON_BY_CODE[code] ?? "cloud";
}

export function WeatherIcon({
  code,
  size = 24,
  isNight = false,
}: {
  code: number | null;
  size?: number;
  isNight?: boolean;
}): React.JSX.Element {
  const iconName = getIconName(code, isNight);

  return <MaterialIcon name={iconName} size={size} />;
}
