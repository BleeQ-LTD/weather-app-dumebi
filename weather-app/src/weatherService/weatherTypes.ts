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

export interface WeatherDetails {
  uvIndex: number | null;
  visibilityKm: number | null;
  dewPoint: number | null;
  precipitationNext24h: number; 
}

export interface Forecast {
  current: CurrentWeather;
  hourly: HourlyWeather[]; 
  daily: DailyWeather[]; 
  details: WeatherDetails;
}


export interface OpenMeteoForecastResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
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
    visibility: (number | null)[];
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
