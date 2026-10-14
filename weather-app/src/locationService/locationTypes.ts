export interface Location {
  name: string; // always "City, Country" for places the app resolved itself
  latitude: number;
  longitude: number;
  countryCode?: string; // ISO code such as "NG"; the same in every service
}

export interface PlaceSuggestion {
  id: number;
  label: string;
  location: Location;
}

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
}

export interface GeocodingResponse {
  results?: GeocodingResult[];
}
