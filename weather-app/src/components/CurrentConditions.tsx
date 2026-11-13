
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
        <p className="current-rain">Chance of rain {rainChance}%</p>
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
