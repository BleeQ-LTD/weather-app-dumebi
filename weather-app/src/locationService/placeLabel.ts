import type { Location } from "./locationTypes";

export function buildPlaceLabel(parts: Array<string | null | undefined>): string {
  return [...new Set(parts)].filter((part): part is string => Boolean(part)).join(", ");
}

// Full country name from an ISO code ("GB" -> "United Kingdom"). The browser
// knows these names, so the label is identical whichever service supplied the code.
function countryNameFor(code: string, fallback: string): string {
  try {
    const shown = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return shown && shown !== code ? shown : fallback;
  } catch {
    return fallback;
  }
}

// The ONE label format used everywhere (search, My Location, favourites): "City, Country"
export function makePlace(
  city: string,
  countryCode?: string,
  countryName?: string
): Pick<Location, "name" | "countryCode"> {
  const code = (countryCode ?? "").trim().toUpperCase();
  const country = code ? countryNameFor(code, countryName ?? "") : (countryName ?? "");

  return {
    name: buildPlaceLabel([city, country]),
    ...(code ? { countryCode: code } : {}),
  };
}
