import type { CurrentWeather, DailyWeather } from "../weatherService/weatherTypes";
import { getWeatherIcon } from "../weatherService/weatherUtils";

interface CurrentConditionsProps {
  name: string;
  isMyLocation: boolean;
  current: CurrentWeather;
  today: DailyWeather | undefined;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

function CurrentConditions({
  name,
  isMyLocation,
  current,
  today,
  isFavourite,
  onToggleFavourite,
}: CurrentConditionsProps) {
  return (
    <header className="current">
      {isMyLocation && <p className="current-label">My Location</p>}
      <h1 className="current-name">{name}</h1>
      <p className="current-temp">{Math.round(current.temperature)}°</p>
      <p className="current-condition">
        <span aria-hidden="true">{getWeatherIcon(current.weatherCode, current.isDay)}</span>{" "}
        {current.weatherDescription}
      </p>
      {today && (
        <p className="current-range">
          H:{Math.round(today.maxTemp)}° L:{Math.round(today.minTemp)}°
        </p>
      )}
      <button type="button" className="btn btn-ghost" onClick={onToggleFavourite}>
        {isFavourite ? "★ Saved" : "☆ Save"}
      </button>
    </header>
  );
}

export default CurrentConditions;
