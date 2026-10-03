import { useState } from "react";
import type { User } from "firebase/auth";
import { logOut } from "../firebaseService/authService";
import { makeFavouriteId } from "../firebaseService/favouritesService";
import { FALLBACK_LOCATION } from "../locationService/geolocationService";
import type { Location } from "../locationService/locationTypes";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { useFavourites } from "../hooks/useFavourites";
import { useForecast } from "../hooks/useForecast";
import LocationSearch from "./LocationSearch";
import FavouriteLocations from "./FavouriteLocations";
import CurrentConditions from "./CurrentConditions";
import HourlyForecast from "./HourlyForecast";
import DailyForecast from "./DailyForecast";
import DetailTiles from "./DetailTiles";
import SidebarToggle from "./SidebarToggle";

interface WeatherScreenProps {
  user: User;
}

function WeatherScreen({ user }: WeatherScreenProps) {
  const { status, myLocation, notice } = useCurrentLocation();
  const [selected, setSelected] = useState<Location | null>(null);

  // Open on desktop, closed on phone-width screens (where it would push the weather down)
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 561px)").matches
  );

  // What's on screen: the user's pick, else where they are, else the fallback (once detection ends)
  const location = selected ?? myLocation ?? (status === "ready" ? FALLBACK_LOCATION : null);

  const { forecast, loading, error } = useForecast(location);
  const { favourites, error: favouritesError, add, remove } = useFavourites(user.uid);

  const currentId = location ? makeFavouriteId(location) : "";
  const isFavourite = favourites.some((f) => f.id === currentId);
  const isMyLocation = Boolean(myLocation && currentId === makeFavouriteId(myLocation));

  async function handleSignOut() {
    try {
      await logOut();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }

  return (
    <div className={sidebarOpen ? "app" : "app sidebar-closed"}>
      <div className="toolbar">
        <SidebarToggle open={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} />
      </div>

      {/* hidden (not removed) so the search box keeps what you typed */}
      <aside className="sidebar" hidden={!sidebarOpen}>
        <LocationSearch onSelect={setSelected} />

        {myLocation && (
          <button
            type="button"
            className={isMyLocation ? "location-row active" : "location-row"}
            onClick={() => setSelected(myLocation)}
          >
            <span>📍 My Location</span>
            <span className="muted small">{myLocation.name}</span>
          </button>
        )}

        {notice && <p className="notice">{notice}</p>}

        <FavouriteLocations
          favourites={favourites}
          activeId={currentId}
          onSelect={setSelected}
          onRemove={remove}
        />
        {favouritesError && <p className="error-text">{favouritesError}</p>}

        <div className="sidebar-footer">
          <span className="muted small">{user.email}</span>
          <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        {!location && <p className="status">Finding your location...</p>}
        {location && loading && <p className="status">Loading weather...</p>}
        {location && !loading && error && <p className="status error-text">{error}</p>}

        {location && forecast && !loading && !error && (
          <>
            <CurrentConditions
              name={location.name}
              isMyLocation={isMyLocation}
              current={forecast.current}
              today={forecast.daily[0]}
              isFavourite={isFavourite}
              onToggleFavourite={() => (isFavourite ? remove(currentId) : add(location))}
            />

            <HourlyForecast hours={forecast.hourly} currentTime={forecast.current.time} />

            <div className="details-layout">
              <DailyForecast days={forecast.daily} />
              <DetailTiles
                current={forecast.current}
                details={forecast.details}
                today={forecast.daily[0]}
              />
            </div>
          </>
        )}

        <p className="attribution muted small">
          <a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>
        </p>
      </main>
    </div>
  );
}

export default WeatherScreen;
