import type { DailyWeather } from "../weatherService/weatherTypes";
import { getDayLabel, getRangeBar, getWeatherIcon } from "../weatherService/weatherUtils";

interface DailyForecastProps {
  days: DailyWeather[];
}

function DailyForecast({ days }: DailyForecastProps) {
  const weekMin = Math.min(...days.map((d) => d.minTemp));
  const weekMax = Math.max(...days.map((d) => d.maxTemp));

  return (
    <section className="panel">
      <h2 className="panel-title">10-day forecast</h2>

      <ul>
        {days.map((day, index) => {
          const bar = getRangeBar(day.minTemp, day.maxTemp, weekMin, weekMax);
          const chance = day.precipitationProbability;

          return (
            <li key={day.date} className="daily-row">
              <span className="daily-day">{getDayLabel(day.date, index)}</span>
              <span className="daily-icon">
                <span aria-hidden="true">{getWeatherIcon(day.weatherCode, true)}</span>
                <span className="daily-precip">{chance !== null && chance >= 20 ? `${chance}%` : ""}</span>
              </span>
              <span className="daily-low">{Math.round(day.minTemp)}°</span>
              <span className="range-track">
                <span
                  className="range-fill"
                  style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                />
              </span>
              <span className="daily-high">{Math.round(day.maxTemp)}°</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default DailyForecast;
