// ---------- What the app uses ----------

export interface CurrentWeather {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGusts: number;
  windDirection: number; // degrees the wind is coming FROM
  pressure: number; // hPa, sea level
  weatherCode: number;
  weatherDescription: string;
  isDay: boolean;
}

export interface HourlyWeather {
  time: string; // e.g. "2026-10-01T14:00"
  temperature: number;
  weatherCode: number;
  weatherDescription: string;
  isDay: boolean;
  precipitationProbability: number | null;
}

export interface DailyWeather {
  date: string; // e.g. "2026-10-01"
  minTemp: number;
  maxTemp: number;
  weatherCode: number;
  weatherDescription: string;
  precipitationProbability: number | null;
  sunrise: string;
  sunset: string;
}

// Values for the detail tiles, taken at the current hour
export interface WeatherDetails {
  uvIndex: number | null;
  visibilityKm: number | null;
  dewPoint: number | null;
  precipitationNext24h: number; // mm
}

export interface Forecast {
  current: CurrentWeather;
  hourly: HourlyWeather[]; // today's 24 hours, 00:00 to 23:00
  daily: DailyWeather[]; // 10 days, starting with today
  details: WeatherDetails;
  utcOffsetSeconds: number; // the location's offset from UTC, so we know when its hour or day changes
}

// ---------- Raw Open-Meteo response ----------

export interface OpenMeteoForecastResponse {
  utc_offset_seconds: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number; // 1 = day, 0 = night
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    pressure_msl: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    is_day: number[];
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    uv_index: (number | null)[];
    visibility: (number | null)[]; // metres
    dew_point_2m: (number | null)[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    sunrise: string[];
    sunset: string[];
  };
}
