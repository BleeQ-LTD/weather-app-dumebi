import type { FavouriteLocation } from "../firebaseService/firebaseTypes";
import type { TemperatureUnit } from "../firebaseService/profileService";
import type { Location } from "../locationService/locationTypes";
import { useFavouriteWeather } from "../hooks/useFavouriteWeather";
import Button from "./Button";
import FavouriteLocations from "./FavouriteLocations";

interface FavouritesPanelProps {
  isGuest: boolean;
  favourites: FavouriteLocation[];
  error: string;
  activeId: string;
  temperatureUnit: TemperatureUnit;
  onSelect: (location: Location) => void;
  onRemove: (id: string) => void;
  onRequestSignIn: () => void;
}

// What opens when someone taps Favourites. Weather for the list loads when this
// appears. A Guest sees a prompt to sign in instead of a list.
function FavouritesPanel({
  isGuest,
  favourites,
  error,
  activeId,
  temperatureUnit,
  onSelect,
  onRemove,
  onRequestSignIn,
}: FavouritesPanelProps) {
  const { byId, failed } = useFavouriteWeather(favourites);

  if (isGuest) {
    return (
      <div className="panel-empty">
        <p className="muted small">Sign in to keep your favourite cities.</p>
        <Button variant="primary" onClick={onRequestSignIn}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <>
      <FavouriteLocations
        favourites={favourites}
        activeId={activeId}
        temperatureUnit={temperatureUnit}
        weatherById={byId}
        onSelect={onSelect}
        onRemove={onRemove}
      />
      {failed && favourites.length > 0 && (
        <p className="muted small">Temperatures are unavailable right now.</p>
      )}
      {error && <p className="error-text">{error}</p>}
    </>
  );
}

export default FavouritesPanel;
