import { useEffect, useRef } from "react";
import type { HourlyWeather } from "../weatherService/weatherTypes";
import {
  getHourLabel,
  getWeatherIcon,
  isCurrentHour,
} from "../weatherService/weatherUtils";
import { scrollWithBounce } from "../utils/scrollWithBounce";
import type { TemperatureUnit } from "../firebaseService/profileService";
import { formatTemperature } from "../weatherService/temperatureUtils";

interface HourlyForecastProps {
  hours: HourlyWeather[];
  currentTime: string;
  temperatureUnit: TemperatureUnit;
}

function HourlyForecast({
  hours,
  currentTime,
  temperatureUnit,
}: HourlyForecastProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const nowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const now = nowRef.current;
    if (!list || !now) return;

    const target =
      now.offsetLeft - list.clientWidth / 2 + now.offsetWidth / 2;

    return scrollWithBounce(list, Math.max(target, 0));
  }, []);

  return (
    <section className="panel">
      <h2 className="panel-title">Hourly forecast</h2>

      <ul className="hourly" ref={listRef}>
        {hours.map((hour) => {
          const isNow = isCurrentHour(hour.time, currentTime);
          const chance = hour.precipitationProbability;

          return (
            <li
              key={hour.time}
              ref={isNow ? nowRef : undefined}
              className={isNow ? "hour current" : "hour"}
            >
              <span className="hour-label">
                {getHourLabel(hour.time, isNow)}
              </span>

              <span className="hour-icon" aria-hidden="true">
                {getWeatherIcon(hour.weatherCode, hour.isDay)}
              </span>

              <span className="hour-precip">
                {chance !== null && chance >= 20 ? `${chance}%` : ""}
              </span>

              <span className="hour-temp">
                {formatTemperature(hour.temperature, temperatureUnit)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default HourlyForecast;