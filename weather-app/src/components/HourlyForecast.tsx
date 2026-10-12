import { useEffect, useRef } from "react";
import type { HourlyWeather } from "../weatherService/weatherTypes";
import { getHourLabel, getWeatherIcon, isCurrentHour } from "../weatherService/weatherUtils";
import { scrollWithBounce } from "../utils/scrollWithBounce";

interface HourlyForecastProps {
  hours: HourlyWeather[]; // today, 00:00 to 23:00
  currentTime: string; // e.g. "2026-10-01T14:15", used to mark the current hour
}

function HourlyForecast({ hours, currentTime }: HourlyForecastProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const nowRef = useRef<HTMLLIElement>(null);

  // The strip opens at 00:00, then scrolls to "Now" (centred) with a bounce.
  // Runs when the strip first appears (a new place remounts it), not on every background
  // refresh, so it never yanks the strip back while someone is browsing it.
  useEffect(() => {
    const list = listRef.current;
    const now = nowRef.current;
    if (!list || !now) return;

    const target = now.offsetLeft - list.clientWidth / 2 + now.offsetWidth / 2;
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
