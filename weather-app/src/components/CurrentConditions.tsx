
import type { CurrentWeather, DailyWeather } from "../weatherService/weatherTypes";
import type { TemperatureUnit } from "../firebaseService/profileService";
import { formatTemperature } from "../weatherService/temperatureUtils";
import { getWeatherIcon } from "../weatherService/weatherUtils";
import SaveButton from "./SaveButton";

interface CurrentConditionsProps {
  name: string;
  isMyLocation: boolean;
  current: CurrentWeather;
  today: DailyWeather | undefined;
  rainChance: number | null;
  isFavourite: boolean;
  saveDisabled: boolean;
  temperatureUnit: TemperatureUnit;
  onToggleFavourite: () => void;
}

function CurrentConditions({
  name,
  isMyLocation,
  current,
  today,
  rainChance,
  isFavourite,
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

      {rainChance !== null && (
        <p className="current-rain">
          <svg
            className="current-rain-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2.5c-.4 0-.7.2-.9.5C9.3 5.6 5.5 11 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 11 14.7 5.6 12.9 3c-.2-.3-.5-.5-.9-.5z" />
          </svg>
          Chance of rain {rainChance}%
        </p>
      )}

      <SaveButton
        isSaved={isFavourite}
        disabled={saveDisabled}
        onToggle={onToggleFavourite}
      />
    </header>
  );
}

export default CurrentConditions;
