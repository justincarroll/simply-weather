import type { Location, Unit } from "../types";
import { detectPreferredUnit } from "./temperature";

const FAHRENHEIT_COUNTRY_CODES = new Set(["US", "BS", "BZ", "KY", "LR", "PW", "FM", "MH"]);
const FAHRENHEIT_COUNTRY_NAMES = new Set([
  "United States",
  "United States of America",
  "Bahamas",
  "Belize",
  "Cayman Islands",
  "Liberia",
  "Palau",
  "Marshall Islands",
  "Federated States of Micronesia",
  "Micronesia",
]);

export function getPreferredUnitForLocation(location: Location | null): Unit {
  if (!location) {
    return detectPreferredUnit();
  }

  if (location.countryCode && FAHRENHEIT_COUNTRY_CODES.has(location.countryCode.toUpperCase())) {
    return "fahrenheit";
  }

  if (location.country && FAHRENHEIT_COUNTRY_NAMES.has(location.country)) {
    return "fahrenheit";
  }

  return "celsius";
}
