import type { HourlyWeather } from "../weatherService/weatherTypes";
import { getHourLabel, getWeatherIcon, isCurrentHour } from "../weatherService/weatherUtils";

interface HourlyForecastProps {
  hours: HourlyWeather[]; // today, 00:00 to 23:00
  currentTime: string; // e.g. "2026-10-01T14:15", used to mark the current hour
}

function HourlyForecast({ hours, currentTime }: HourlyForecastProps) {
  return (
    <section className="panel">
      <h2 className="panel-title">Hourly forecast</h2>

      <ul className="hourly">
        {hours.map((hour) => {
          const isNow = isCurrentHour(hour.time, currentTime);
          const chance = hour.precipitationProbability;

          return (
            <li key={hour.time} className={isNow ? "hour current" : "hour"}>
              <span className="hour-label">{getHourLabel(hour.time, isNow)}</span>
              <span className="hour-icon" aria-hidden="true">
                {getWeatherIcon(hour.weatherCode, hour.isDay)}
              </span>
              <span className="hour-precip">{chance !== null && chance >= 20 ? `${chance}%` : ""}</span>
              <span className="hour-temp">{Math.round(hour.temperature)}°</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default HourlyForecast;
