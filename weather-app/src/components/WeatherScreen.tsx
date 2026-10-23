import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { logOut } from "../firebaseService/authService";
import { isSamePlace, makeFavouriteId } from "../firebaseService/favouriteId"; // CHANGED: import path + isSamePlace
import type { Location } from "../locationService/locationTypes";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { useFavourites } from "../hooks/useFavourites";
import { useForecast } from "../hooks/useForecast";
import LocationSearch from "./LocationSearch";
import FavouriteLocations from "./FavouriteLocations";
import GuestInfo from "./GuestInfo";
import CurrentConditions from "./CurrentConditions";
import HourlyForecast from "./HourlyForecast";
import DailyForecast from "./DailyForecast";
import DetailTiles from "./DetailTiles";
import SidebarToggle from "./SidebarToggle";
import VerifyEmailBanner from "./VerifyEmailBanner";
interface WeatherScreenProps {
  user: User | null; // null means the visitor is a guest
  onRequestSignIn: () => void;
}

function WeatherScreen({ user, onRequestSignIn }: WeatherScreenProps) {
  const isGuest = user === null;

  const { status, myLocation, notice } = useCurrentLocation();
  const [selected, setSelected] = useState<Location | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // CHANGED: no FALLBACK_LOCATION; null if nothing could be detected
  const location = selected ?? myLocation;

  const { forecast, loading, error, refreshFailed } = useForecast(location);

  // CHANGED: also read `loaded` from the hook
  const {
    favourites,
    loaded: favouritesLoaded,
    error: favouritesError,
    add,
    remove,
  } = useFavourites(user?.uid ?? null);

  // CHANGED: "Saved" is decided by distance, so it works after a reload
  const savedMatches = location ? favourites.filter((f) => isSamePlace(f, location)) : [];
  const isFavourite = savedMatches.length > 0;
  const currentId = savedMatches[0]?.id ?? (location ? makeFavouriteId(location) : "");
  const isMyLocation = Boolean(myLocation && location && isSamePlace(myLocation, location));

  // While the overlay is open: Escape closes it and the page behind it doesn't scroll
  useEffect(() => {
    if (!sidebarOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  // Picking a place closes the overlay so the weather is visible straight away
  function handleSelect(next: Location) {
    setSelected(next);
    setSidebarOpen(false);
  }

  function handleToggleFavourite() {
    if (!location) return;
    if (isGuest) onRequestSignIn();
    else if (isFavourite) savedMatches.forEach((f) => remove(f.id)); // CHANGED: also clears old duplicates
    else add(location);
  }

  async function handleSignOut() {
    try {
      await logOut();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  }

  return (
    <div className="app">
      {/* Floating, so it is always reachable (including on phones) */}
      <SidebarToggle open={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} />

      {sidebarOpen && (
        <div className="backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside className={sidebarOpen ? "sidebar open" : "sidebar"} aria-label="Locations and account">
        <LocationSearch onSelect={handleSelect} />

        {myLocation && (
          <button
            type="button"
            className={isMyLocation ? "location-row active" : "location-row"}
            onClick={() => handleSelect(myLocation)}
          >
            <span>📍 My Location</span>
            <span className="muted small">{myLocation.name}</span>
          </button>
        )}

        {/* CHANGED: the notice was removed from the sidebar (it is in <main> now) */}

        {isGuest ? (
          <GuestInfo onRequestSignIn={onRequestSignIn} />
        ) : (
          <>
            <FavouriteLocations
              favourites={favourites}
              activeId={currentId}
              onSelect={handleSelect}
              onRemove={remove}
            />
            {favouritesError && <p className="error-text">{favouritesError}</p>}
          </>
        )}

        <div className="sidebar-footer">
          {user ? (
            <>
              <span className="muted small">{user.email}</span>
              <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <span className="muted small">Browsing as a guest</span>
          )}
        </div>
      </aside>

      <main className="main">
        {user && <VerifyEmailBanner user={user} />}
        {/* CHANGED: notice now lives in the main view so phones see it too */}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        {/* CHANGED: loading / nothing-detected messages no longer depend on FALLBACK_LOCATION */}
        {!location && status === "detecting" && <p className="status">Finding your location...</p>}
        {!location && status === "ready" && (
          <p className="status">Search for a city to see its weather.</p>
        )}
        {location && loading && <p className="status">Loading weather...</p>}
        {location && !loading && error && <p className="status error-text">{error}</p>}

        {location && forecast && !loading && !error && (
          <>
            {refreshFailed && (
              <p className="notice">
                The forecast could not be refreshed and may be out of date.
              </p>
            )}

            <CurrentConditions
              name={location.name}
              isMyLocation={isMyLocation}
              current={forecast.current}
              today={forecast.daily[0]}
              isFavourite={isFavourite}
              isGuest={isGuest}
              saveDisabled={!isGuest && !favouritesLoaded} // CHANGED: this is the missing prop
              onToggleFavourite={handleToggleFavourite}
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