export interface Location {
  name: string;
  latitude: number;
  longitude: number;
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
  admin1?: string; 
}

export interface GeocodingResponse {
  results?: GeocodingResult[];
}