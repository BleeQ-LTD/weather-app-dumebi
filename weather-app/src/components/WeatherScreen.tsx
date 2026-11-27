
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  isSamePlace,
  makeFavouriteId,
} from "../firebaseService/favouriteId";
import { logOut } from "../firebaseService/authService";
import {
  getUserProfile,
  saveTemperatureUnit,
  type TemperatureUnit,
} from "../firebaseService/profileService";
import type { Location } from "../locationService/locationTypes";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { useFavourites } from "../hooks/useFavourites";
import { useForecast } from "../hooks/useForecast";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  getStoredTemperatureUnit,
  storeTemperatureUnit,
} from "../utils/unitPreference";
import LocationSearch from "./LocationSearch";
import BottomBar from "./BottomBar";
import Sidebar from "./Sidebar";
import type { AppNavProps } from "./navTypes";
import CurrentConditions from "./CurrentConditions";
import HourlyForecast from "./HourlyForecast";
import DailyForecast from "./DailyForecast";
import DetailTiles from "./DetailTiles";
import SkyBackground from "./SkyBackground";
import CompareView from "./CompareView";
import { getRainChance, getSkyTheme } from "../weatherService/weatherUtils";
import { getLastLocation } from "../locationService/lastLocation";
import { useTheme } from "../utils/themePreference";
import { useDistanceUnit } from "../utils/distancePreference";
import { saveLastLocation } from "../locationService/lastLocation";

interface WeatherScreenProps {
  user: User | null;
  // Signed in and the profile is complete, so saving can go ahead
  accountReady?: boolean;
  // The sign-in overlay is open on top of this screen
  signInOpen?: boolean;
  appVersion?: string;
  onOpenWhatsNew?: () => void;
  onOpenProfile?: () => void;
  onRequestSignIn: () => void;
}

function WeatherScreen({
  user,
  accountReady = false,
  signInOpen = false,
  appVersion,
  onOpenWhatsNew,
  onRequestSignIn,
  onOpenProfile
}: WeatherScreenProps) {
  const isGuest = user === null;

  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>(
    () => getStoredTemperatureUnit()
  );
  const [unitError, setUnitError] = useState("");
  const { theme, changeTheme } = useTheme();
  const { distanceUnit, changeDistanceUnit } = useDistanceUnit();

  useEffect(() => {
    let active = true;

    async function loadTemperaturePreference() {
      if (!user) {
        setTemperatureUnit(getStoredTemperatureUnit());
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
  const [selected, setSelected] = useState<Location | null>(
    () => getLastLocation()
  );
  // Desktop: sidebar is expanded by default.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Wide screens get the sidebar, phones get the bottom bar.
  const isDesktop = useMediaQuery("(min-width: 769px)");

  const location = selected ?? myLocation;

  const { forecast, loading, error, refreshFailed } =
    useForecast(location);

  useEffect(() => {
    if (!location || !forecast || loading || error) return;

    saveLastLocation(location);
  }, [location, forecast, loading, error]);

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

  // Compare two cities: replaces the forecast until closed (nothing is saved)
  const [compareOpen, setCompareOpen] = useState(false);

  function handleSelect(next: Location) {
    setCompareOpen(false);
    setSelected(next);
  }

  // Signed-in users keep the unit in their profile, Guests on this device.
  // The screen updates straight away and goes back if saving fails.
  async function handleChangeUnit(next: TemperatureUnit) {
    if (next === temperatureUnit) return;

    const previous = temperatureUnit;
    setTemperatureUnit(next);
    setUnitError("");

    if (!user) {
      storeTemperatureUnit(next);
      return;
    }

    try {
      await saveTemperatureUnit(user.uid, next);
    } catch (error) {
      console.error("Unable to save temperature unit:", error);
      setTemperatureUnit(previous);
      setUnitError("Couldn't save your choice. Please try again.");
    }
  }

  // A guest who taps Save is asked to sign in; the city is saved for them as
  // soon as their account is ready. Closing the sign-in card forgets it.
  const [pendingSave, setPendingSave] = useState<Location | null>(null);

  useEffect(() => {
    if (!user && !signInOpen) setPendingSave(null);
  }, [user, signInOpen]);

  useEffect(() => {
    if (!pendingSave || !accountReady || !favouritesLoaded) return;
    setPendingSave(null);
    add(pendingSave).catch((saveError) =>
      console.error("Saving the city after sign-in failed:", saveError)
    );
  }, [pendingSave, accountReady, favouritesLoaded, add]);

  function handleToggleFavourite() {
    if (!location) return;

    if (isGuest) {
      setPendingSave(location);
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
  ].join(" ");

  const navProps: AppNavProps = {
    user,
    myLocation,
    isMyLocationActive: isMyLocation && !compareOpen,
    favourites,
    favouritesError,
    activeFavouriteId: currentId,
    temperatureUnit,
    unitError,
    onChangeUnit: handleChangeUnit,
    theme,
    onChangeTheme: changeTheme,
    distanceUnit,
    onChangeDistanceUnit: changeDistanceUnit,
    appVersion,
    onOpenWhatsNew,
    onSelect: handleSelect,
    compareOpen,
    onOpenCompare: () => setCompareOpen(true),
    onRemoveFavourite: remove,
    onRequestSignIn,
    onOpenProfile,
    onSignOut: logOut,
  };

  return (
    <div className={appClassName}>
      <SkyBackground
        theme={
          forecast && !loading && !error
            ? getSkyTheme(forecast.current.weatherCode, forecast.current.isDay)
            : null
        }
      />

      {isDesktop && (
        <Sidebar
          {...navProps}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
        />
      )}

      {/* Main weather screen */}
      <main className="main">
        {compareOpen ? (
          <CompareView
            initialCity={location}
            temperatureUnit={temperatureUnit}
            distanceUnit={distanceUnit}
            onClose={() => setCompareOpen(false)}
          />
        ) : (
        <>
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
              rainChance={getRainChance(forecast)}
              isFavourite={isFavourite}
              saveDisabled={!isGuest && !favouritesLoaded}
              onToggleFavourite={handleToggleFavourite}
            />

            <HourlyForecast
              hours={forecast.hourly}
              currentTime={forecast.current.time}
              temperatureUnit={temperatureUnit}
            />

            <div className="details-layout">
              <DailyForecast
                days={forecast.daily}
                temperatureUnit={temperatureUnit}
              />

              <DetailTiles
                current={forecast.current}
                details={forecast.details}
                today={forecast.daily[0]}
                temperatureUnit={temperatureUnit}
                distanceUnit={distanceUnit}
              />
            </div>
          </>
        )}

        </>
        )}

        <p className="attribution muted small">
          Data: <a href="https://open-meteo.com/">Open-Meteo</a>
          {" · "}
          <a href="https://www.geonames.org/">GeoNames</a>
        </p>
      </main>

      {!isDesktop && <BottomBar {...navProps} />}
    </div>
  );
}

export default WeatherScreen;
