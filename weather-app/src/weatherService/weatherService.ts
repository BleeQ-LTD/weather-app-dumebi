import type {
  CurrentWeather,
  DailyWeather,
  Forecast,
  HourlyWeather,
  OpenMeteoForecastResponse,
  WeatherDetails,
} from "./weatherTypes";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather interpretation codes used by Open-Meteo
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm (slight or moderate)",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function getWeatherDescription(code: number): string {
  return WEATHER_DESCRIPTIONS[code] ?? "Unknown weather";
}

const CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "pressure_msl",
];

const HOURLY_VARIABLES = [
  "temperature_2m",
  "weather_code",
  "is_day",
  "precipitation_probability",
  "precipitation",
  "uv_index",
  "visibility",
  "dew_point_2m",
];

const DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "sunrise",
  "sunset",
];

const HOURS_TO_SHOW = 24;

export async function getForecast(latitude: number, longitude: number): Promise<Forecast> {
  const url =
    `${BASE_URL}?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=${CURRENT_VARIABLES.join(",")}` +
    `&hourly=${HOURLY_VARIABLES.join(",")}` +
    `&daily=${DAILY_VARIABLES.join(",")}` +
    `&forecast_days=8` +
    `&timezone=auto`; 

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch weather data (status ${response.status})`);
  }

  const data: OpenMeteoForecastResponse = await response.json();

  return mapForecast(data);
}

function mapForecast(data: OpenMeteoForecastResponse): Forecast {
  const { current, hourly, daily } = data;

  const currentHour = `${current.time.slice(0, 13)}:00`;
  const found = hourly.time.indexOf(currentHour);
  const start = found === -1 ? 0 : found;
  const end = start + HOURS_TO_SHOW;

  const currentWeather: CurrentWeather = {
    time: current.time,
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    windGusts: current.wind_gusts_10m,
    windDirection: current.wind_direction_10m,
    pressure: current.pressure_msl,
    weatherCode: current.weather_code,
    weatherDescription: getWeatherDescription(current.weather_code),
    isDay: current.is_day === 1,
  };

  const todayStart = hourly.time.indexOf(`${current.time.slice(0, 10)}T00:00`);
  const dayStart = todayStart === -1 ? 0 : todayStart;

  const hourlyEntries: HourlyWeather[] = hourly.time
    .slice(dayStart, dayStart + HOURS_TO_SHOW)
    .map((time, offset) => {
      const i = dayStart + offset;
      return {
        time,
        temperature: hourly.temperature_2m[i],
        weatherCode: hourly.weather_code[i],
        weatherDescription: getWeatherDescription(hourly.weather_code[i]),
        isDay: hourly.is_day[i] === 1,
        precipitationProbability: hourly.precipitation_probability[i] ?? null,
      };
    });

  const dailyEntries: DailyWeather[] = daily.time.map((date, i) => ({
    date,
    minTemp: daily.temperature_2m_min[i],
    maxTemp: daily.temperature_2m_max[i],
    weatherCode: daily.weather_code[i],
    weatherDescription: getWeatherDescription(daily.weather_code[i]),
    precipitationProbability: daily.precipitation_probability_max[i] ?? null,
    sunrise: daily.sunrise[i],
    sunset: daily.sunset[i],
  }));

  let precipitationNext24h = 0;
  for (let i = start; i < Math.min(end, hourly.time.length); i++) {
    precipitationNext24h += hourly.precipitation[i] ?? 0;
  }

  const visibilityMetres = hourly.visibility[start] ?? null;

  const details: WeatherDetails = {
    uvIndex: hourly.uv_index[start] ?? null,
    visibilityKm: visibilityMetres === null ? null : Math.round(visibilityMetres / 1000),
    dewPoint: hourly.dew_point_2m[start] ?? null,
    precipitationNext24h: Math.round(precipitationNext24h * 10) / 10,
  };

  return {
    current: currentWeather,
    hourly: hourlyEntries,
    daily: dailyEntries,
    details,
  };
}
