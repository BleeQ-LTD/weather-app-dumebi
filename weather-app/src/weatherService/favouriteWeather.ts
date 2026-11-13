import type { Location } from "../locationService/locationTypes";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// A result is reused for this long, so opening and closing the list does not refetch
export const FAVOURITE_WEATHER_TTL_MS = 5 * 60 * 1000;

// What one row of the Favourites list needs
export interface FavouriteWeather {
  temperature: number; // Celsius
  weatherCode: number;
  isDay: boolean;
}

type Place = Pick<Location, "latitude" | "longitude">;

interface PlaceResponse {
  current?: {
    temperature_2m: number;
    weather_code: number;
    is_day: number;
  };
}

const cache = new Map<string, { value: FavouriteWeather; fetchedAt: number }>();

export function clearFavouriteWeatherCache(): void {
  cache.clear();
}

// Two decimals is about one kilometre: the same city always maps to the same key
function keyOf(place: Place): string {
  return `${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;
}

// One request covers every place that is not already cached. The result lines up
// with `places`: null means Open-Meteo returned nothing for that place.
export async function getFavouritesWeather(
  places: Place[],
  now: number = Date.now()
): Promise<(FavouriteWeather | null)[]> {
  const missing = new Map<string, Place>();

  for (const place of places) {
    const key = keyOf(place);
    const entry = cache.get(key);

    if (!entry || now - entry.fetchedAt >= FAVOURITE_WEATHER_TTL_MS) {
      missing.set(key, place);
    }
  }

  if (missing.size > 0) {
    const requested = [...missing.entries()];
    const url =
      `${BASE_URL}?latitude=${requested.map(([, p]) => p.latitude.toFixed(2)).join(",")}` +
      `&longitude=${requested.map(([, p]) => p.longitude.toFixed(2)).join(",")}` +
      `&current=temperature_2m,weather_code,is_day`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch favourite weather (status ${response.status})`);
    }

    // Several places come back as a list, a single place as one object
    const body: PlaceResponse | PlaceResponse[] = await response.json();
    const results = Array.isArray(body) ? body : [body];

    requested.forEach(([key], index) => {
      const current = results[index]?.current;
      if (!current) return;

      cache.set(key, {
        value: {
          temperature: current.temperature_2m,
          weatherCode: current.weather_code,
          isDay: current.is_day === 1,
        },
        fetchedAt: now,
      });
    });
  }

  return places.map((place) => cache.get(keyOf(place))?.value ?? null);
}
