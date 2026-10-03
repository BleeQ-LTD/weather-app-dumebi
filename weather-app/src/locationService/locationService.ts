import type {
  PlaceSuggestion,
  GeocodingResponse,
} from "./locationTypes";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export async function searchPlaces(input: string): Promise<PlaceSuggestion[]> {
  const url =
    `${GEOCODING_URL}?name=${encodeURIComponent(input)}` +
    `&count=5` +
    `&language=en`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to search places (status ${response.status})`);
  }

  const data: GeocodingResponse = await response.json();

  return (data.results ?? []).map((result) => {
    const parts = [...new Set([result.name, result.admin1, result.country])].filter(
      (part): part is string => Boolean(part)
    );
    const label = parts.join(", ");

    return {
      id: result.id,
      label,
      location: {
        name: label,
        latitude: result.latitude,
        longitude: result.longitude,
      },
    };
  });
}