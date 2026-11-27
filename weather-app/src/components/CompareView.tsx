import { useState, type ReactNode } from "react";
import type { TemperatureUnit } from "../firebaseService/profileService";
import type { Location } from "../locationService/locationTypes";
import { useForecast } from "../hooks/useForecast";
import { useBackButtonClose } from "../hooks/useBackButtonClose";
import { formatTemperature } from "../weatherService/temperatureUtils";
import { formatSpeed, type DistanceUnit } from "../weatherService/distanceUtils";
import { getRainChance, getWeatherIcon } from "../weatherService/weatherUtils";
import { describeTemperatureDifference, shortPlaceName } from "../weatherService/compareUtils";
import type { Forecast } from "../weatherService/weatherTypes";
import LocationSearch from "./LocationSearch";
import { BackIcon } from "./Icons";

interface CompareViewProps {
  initialCity: Location | null; // the city on the main screen
  temperatureUnit: TemperatureUnit;
  distanceUnit?: DistanceUnit;
  onClose: () => void;
}

interface Side {
  location: Location | null;
  forecast: Forecast | null;
  loading: boolean;
  error: string;
}

function useSide(location: Location | null): Side {
  const { forecast, loading, error } = useForecast(location);
  return { location, forecast: location ? forecast : null, loading, error };
}

const DASH = "–";

// Two cities' current weather side by side: one column per city and one row
// per measurement, so each line reads straight across. Nothing is saved.
function CompareView({ initialCity, temperatureUnit, distanceUnit = "metric", onClose }: CompareViewProps) {
  const [cityA, setCityA] = useState<Location | null>(initialCity);
  const [cityB, setCityB] = useState<Location | null>(null);

  const a = useSide(cityA);
  const b = useSide(cityB);

  useBackButtonClose(true, onClose);

  const temp = (celsius: number | undefined) =>
    celsius === undefined ? DASH : formatTemperature(celsius, temperatureUnit);

  const rows: { label: string; value: (side: Side) => ReactNode }[] = [
    {
      label: "High / Low",
      value: (side) => {
        const today = side.forecast?.daily[0];
        return today ? `${temp(today.maxTemp)} / ${temp(today.minTemp)}` : DASH;
      },
    },
    {
      label: "Chance of rain",
      value: (side) => {
        const chance = side.forecast ? getRainChance(side.forecast) : null;
        return chance === null ? DASH : `${chance}%`;
      },
    },
    { label: "Feels like", value: (side) => temp(side.forecast?.current.feelsLike) },
    {
      label: "Humidity",
      value: (side) => (side.forecast ? `${Math.round(side.forecast.current.humidity)}%` : DASH),
    },
    {
      label: "Wind",
      value: (side) => {
        if (!side.forecast) return DASH;
        const wind = formatSpeed(side.forecast.current.windSpeed, distanceUnit);
        return `${wind.value} ${wind.unit}`;
      },
    },
  ];

  const summary =
    a.forecast && b.forecast && cityA && cityB
      ? describeTemperatureDifference(
          cityA.name,
          a.forecast.current.temperature,
          cityB.name,
          b.forecast.current.temperature,
          temperatureUnit
        )
      : "";

  function head(side: Side, fallback: string) {
    if (!side.location) {
      return <p className="compare-empty muted">{fallback}</p>;
    }

    const current = side.forecast?.current;

    return (
      <>
        <p className="compare-city" title={side.location.name}>
          {shortPlaceName(side.location.name)}
        </p>
        {side.error ? (
          <p className="error-text small">Weather unavailable</p>
        ) : side.loading || !current ? (
          <p className="muted small" role="status">Loading…</p>
        ) : (
          <>
            <p className="compare-temp">{temp(current.temperature)}</p>
            <p className="compare-condition">
              <span aria-hidden="true">{getWeatherIcon(current.weatherCode, current.isDay)}</span>{" "}
              {current.weatherDescription}
            </p>
          </>
        )}
      </>
    );
  }

  return (
    <section className="compare" aria-labelledby="compare-title">
      <header className="compare-header">
        <button type="button" className="icon-button" aria-label="Back to the forecast" onClick={onClose}>
          <BackIcon />
        </button>
        <h1 id="compare-title">Compare cities</h1>
      </header>

      <div className="compare-pickers">
        <LocationSearch onSelect={setCityA} placeholder="First city" label="Choose the first city" />
        <LocationSearch onSelect={setCityB} placeholder="Second city" label="Choose the second city" />
      </div>

      <div className="compare-table panel" role="table" aria-label="Weather comparison">
        <div className="compare-row compare-row-head" role="row">
          <span role="columnheader" className="compare-label" />
          <div role="columnheader" className="compare-cell">
            {head(a, "Choose a city")}
          </div>
          <div role="columnheader" className="compare-cell">
            {head(b, "Choose a second city above")}
          </div>
        </div>

        {rows.map((row) => (
          <div className="compare-row" role="row" key={row.label}>
            <span role="rowheader" className="compare-label">
              {row.label}
            </span>
            <span role="cell" className="compare-cell">
              {row.value(a)}
            </span>
            <span role="cell" className="compare-cell">
              {row.value(b)}
            </span>
          </div>
        ))}
      </div>

      {summary && (
        <p className="compare-summary" role="status">
          {summary}
        </p>
      )}
    </section>
  );
}

export default CompareView;
