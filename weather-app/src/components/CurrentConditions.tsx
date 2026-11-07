
import type { CurrentWeather, DailyWeather } from "../weatherService/weatherTypes";
import type { TemperatureUnit } from "../firebaseService/profileService";
import { formatTemperature } from "../weatherService/temperatureUtils";
import { getWeatherIcon } from "../weatherService/weatherUtils";

interface CurrentConditionsProps {
  name: string;
  isMyLocation: boolean;
  current: CurrentWeather;
  today: DailyWeather | undefined;
  isFavourite: boolean;
  isGuest: boolean;
  saveDisabled: boolean;
  temperatureUnit: TemperatureUnit;
  onToggleFavourite: () => void;
}

function CurrentConditions({
  name,
  isMyLocation,
  current,
  today,
  isFavourite,
  isGuest,
  saveDisabled,
  temperatureUnit,
  onToggleFavourite,
}: CurrentConditionsProps) {
  return (
    <header className="current">
      {isMyLocation && <p className="current-label">My Location</p>}
      <h1 className="current-name">{name}</h1>

      <p className="current-temp">
        {formatTemperature(current.temperature, temperatureUnit)}
      </p>

      <p className="current-condition">
        <span aria-hidden="true">
          {getWeatherIcon(current.weatherCode, current.isDay)}
        </span>{" "}
        {current.weatherDescription}
      </p>

      {today && (
        <p className="current-range">
          H:{formatTemperature(today.maxTemp, temperatureUnit)}{" "}
          L:{formatTemperature(today.minTemp, temperatureUnit)}
        </p>
      )}

      <button
        type="button"
        className="btn btn-ghost"
        disabled={saveDisabled}
        onClick={onToggleFavourite}
      >
        {isGuest ? "☆ Sign in to save" : isFavourite ? "★ Saved" : "☆ Save"}
      </button>
    </header>
  );
}

export default CurrentConditions;
