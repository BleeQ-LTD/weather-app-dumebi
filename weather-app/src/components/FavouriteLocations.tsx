import type { FavouriteLocation } from "../firebaseService/firebaseTypes";
import type { TemperatureUnit } from "../firebaseService/profileService";
import type { Location } from "../locationService/locationTypes";
import { formatTemperature } from "../weatherService/temperatureUtils";
import type { FavouriteWeather } from "../weatherService/favouriteWeather";
import { getWeatherIcon } from "../weatherService/weatherUtils";
import { CloseIcon } from "./Icons";

interface FavouriteLocationsProps {
  favourites: FavouriteLocation[];
  activeId: string;
  temperatureUnit: TemperatureUnit;
  weatherById: Record<string, FavouriteWeather>;
  onSelect: (location: Location) => void;
  onRemove: (id: string) => void;
}

// The list of Favourites: name, current weather and a remove button for each
function FavouriteLocations({
  favourites,
  activeId,
  temperatureUnit,
  weatherById,
  onSelect,
  onRemove,
}: FavouriteLocationsProps) {
  if (favourites.length === 0) {
    return (
      <p className="muted small">No favourites yet. Open a city and tap Save.</p>
    );
  }

  return (
    <ul className="favourites">
      {favourites.map((favourite) => {
        const isActive = favourite.id === activeId;
        const weather = weatherById[favourite.id];

        return (
          <li key={favourite.id} className={isActive ? "favourite active" : "favourite"}>
            <button
              type="button"
              className="favourite-main"
              aria-current={isActive ? "true" : undefined}
              onClick={() =>
                onSelect({
                  name: favourite.name,
                  latitude: favourite.latitude,
                  longitude: favourite.longitude,
                })
              }
            >
              <span className="favourite-name">{favourite.name}</span>
              {weather && (
                <span className="favourite-weather">
                  <span aria-hidden="true">
                    {getWeatherIcon(weather.weatherCode, weather.isDay)}
                  </span>
                  <span>{formatTemperature(weather.temperature, temperatureUnit)}</span>
                </span>
              )}
            </button>
            <button
              type="button"
              className="favourite-remove"
              aria-label={`Remove ${favourite.name} from favourites`}
              onClick={() => onRemove(favourite.id)}
            >
              <CloseIcon />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default FavouriteLocations;
