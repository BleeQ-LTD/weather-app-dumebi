
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  isSamePlace,
  makeFavouriteId,
} from "../firebaseService/favouriteId";
import {
  getUserProfile,
  type TemperatureUnit,
} from "../firebaseService/profileService";
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

interface WeatherScreenProps {
  user: User | null;
  onOpenProfile?: () => void;
  onRequestSignIn: () => void;
}

function WeatherScreen({
  user,
  onRequestSignIn,
  onOpenProfile
}: WeatherScreenProps) {
  const isGuest = user === null;

  const [temperatureUnit, setTemperatureUnit] =
    useState<TemperatureUnit>("celsius");

  useEffect(() => {
    let active = true;

    async function loadTemperaturePreference() {
      if (!user) {
        setTemperatureUnit("celsius");
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);

        if (active && profile) {
          setTemperatureUnit(profile.temperatureUnit);
        }
      } catch (error) {
        console.error("Unable to load temperature preference:", error);
      }
    }

    loadTemperaturePreference();

    return () => {
      active = false;
    };
  }, [user]);

  const { status, myLocation, notice } = useCurrentLocation();
  const [selected, setSelected] = useState<Location | null>(null);

  // Desktop: sidebar is expanded by default.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile: drawer is closed by default.
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const location = selected ?? myLocation;

  const { forecast, loading, error, refreshFailed } =
    useForecast(location);

  const {
    favourites,
    loaded: favouritesLoaded,
    error: favouritesError,
    add,
    remove,
  } = useFavourites(user?.uid ?? null);

  const savedMatches = location
    ? favourites.filter((f) => isSamePlace(f, location))
    : [];

  const isFavourite = savedMatches.length > 0;

  const currentId =
    savedMatches[0]?.id ??
    (location ? makeFavouriteId(location) : "");

  const isMyLocation = Boolean(
    myLocation && location && isSamePlace(myLocation, location)
  );

  // Handle Escape and prevent background scrolling
  // while the mobile sidebar is open.
  useEffect(() => {
    if (!mobileSidebarOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  // Desktop minimizes the sidebar.
  // Mobile opens and closes the drawer.
  function handleSidebarToggle() {
    const isDesktop = window.matchMedia(
      "(min-width: 769px)"
    ).matches;

    if (isDesktop) {
      setSidebarCollapsed((collapsed) => !collapsed);
    } else {
      setMobileSidebarOpen((open) => !open);
    }
  }

  function handleSelect(next: Location) {
    setSelected(next);

    // Close the drawer only on mobile.
    setMobileSidebarOpen(false);
  }

  function handleToggleFavourite() {
    if (!location) return;

    if (isGuest) {
      onRequestSignIn();
    } else if (isFavourite) {
      savedMatches.forEach((f) => remove(f.id));
    } else {
      add(location);
    }
  }

  const appClassName = [
    "app",
    sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded",
    mobileSidebarOpen ? "mobile-sidebar-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={appClassName}>
      <SidebarToggle
        open={!sidebarCollapsed}
        onToggle={handleSidebarToggle}
      />

      {mobileSidebarOpen && (
        <div
          className="backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${mobileSidebarOpen ? "open" : ""
          } ${sidebarCollapsed ? "collapsed" : ""}`}
        aria-label="Locations and account"
      >
        {myLocation && (
          <button
            type="button"
            className={
              isMyLocation
                ? "location-row active"
                : "location-row"
            }
            onClick={() => handleSelect(myLocation)}
          >
            <span>📍 My Location</span>
            <span className="muted small">
              {myLocation.name}
            </span>
          </button>
        )}

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

            {favouritesError && (
              <p className="error-text">
                {favouritesError}
              </p>
            )}
          </>
        )}

        <div className="sidebar-footer">
          {user ? (
            <>
              <span className="muted small">{user.email}</span>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={onOpenProfile}
              >
                Profile
              </button>
            </>
          ) : (
            <span className="muted small">Browsing as a guest</span>
          )}
        </div>
      </aside>

      {/* Main weather screen */}
      <main className="main">

        {/* Search bar: always above the location heading */}
        <div className="main-location-search">
          <LocationSearch onSelect={handleSelect} />
        </div>

        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        {!location && status === "detecting" && (
          <p className="status">
            Finding your location...
          </p>
        )}

        {!location && status === "ready" && (
          <p className="status">
            Search for a city to see its weather.
          </p>
        )}

        {location && loading && (
          <p className="status">
            Loading weather...
          </p>
        )}

        {location && !loading && error && (
          <p className="status error-text">
            {error}
          </p>
        )}

        {location && forecast && !loading && !error && (
          <>
            {refreshFailed && (
              <p className="notice">
                The forecast could not be refreshed and may be out of date.
              </p>
            )}

            <CurrentConditions
              name={location.name}
              temperatureUnit={temperatureUnit}
              isMyLocation={isMyLocation}
              current={forecast.current}
              today={forecast.daily[0]}
              isFavourite={isFavourite}
              isGuest={isGuest}
              saveDisabled={!isGuest && !favouritesLoaded}
              onToggleFavourite={handleToggleFavourite}
            />

            <HourlyForecast
              hours={forecast.hourly}
              currentTime={forecast.current.time}
              temperatureUnit={temperatureUnit}
            />

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
          <a href="https://open-meteo.com/">
            Weather data by Open-Meteo.com
          </a>
        </p>
      </main>
    </div>
  );
}

export default WeatherScreen;
