import type { ReactNode } from "react";
import type { CurrentWeather, DailyWeather, WeatherDetails } from "../weatherService/weatherTypes";
import {
  formatTime,
  getCompassDirection,
  getFeelsLikeDescription,
  getUvLabel,
  getVisibilityDescription,
} from "../weatherService/weatherUtils";

interface DetailTilesProps {
  current: CurrentWeather;
  details: WeatherDetails;
  today: DailyWeather | undefined;
}

interface TileProps {
  title: string;
  value: ReactNode;
  children?: ReactNode;
  note?: string;
}

function Tile({ title, value, children, note }: TileProps) {
  return (
    <section className="tile">
      <h3 className="tile-title">{title}</h3>
      <p className="tile-value">{value}</p>
      {children}
      {note && <p className="tile-note">{note}</p>}
    </section>
  );
}

function DetailTiles({ current, details, today }: DetailTilesProps) {
  const uv = details.uvIndex;

  return (
    <div className="tiles">
      <Tile
        title="Feels like"
        value={`${Math.round(current.feelsLike)}°`}
        note={getFeelsLikeDescription(current.feelsLike, current.temperature)}
      />

      <Tile
        title="Humidity"
        value={`${Math.round(current.humidity)}%`}
        note={
          details.dewPoint !== null
            ? `The dew point is ${Math.round(details.dewPoint)}° right now.`
            : undefined
        }
      />

      <Tile
        title="Wind"
        value={
          <>
            {Math.round(current.windSpeed)} <span className="tile-unit">km/h</span>
          </>
        }
        note={`Gusts up to ${Math.round(current.windGusts)} km/h`}
      >
        <p className="wind-direction">
          <span
            className="wind-arrow"
            aria-hidden="true"
            style={{ transform: `rotate(${current.windDirection + 180}deg)` }}
          >
            ↑
          </span>{" "}
          From {getCompassDirection(current.windDirection)}
        </p>
      </Tile>

      <Tile
        title="UV index"
        value={uv === null ? "–" : Math.round(uv)}
        note={uv === null ? undefined : getUvLabel(uv)}
      >
        {uv !== null && (
          <span className="uv-track">
            <span className="uv-marker" style={{ left: `${Math.min(uv / 11, 1) * 100}%` }} />
          </span>
        )}
      </Tile>

      <Tile
        title="Sunset"
        value={today ? formatTime(today.sunset) : "–"}
        note={today ? `Sunrise: ${formatTime(today.sunrise)}` : undefined}
      />

      <Tile
        title="Visibility"
        value={details.visibilityKm === null ? "–" : `${details.visibilityKm} km`}
        note={
          details.visibilityKm === null
            ? undefined
            : getVisibilityDescription(details.visibilityKm)
        }
      />

      <Tile
        title="Pressure"
        value={
          <>
            {Math.round(current.pressure).toLocaleString("en-US")}{" "}
            <span className="tile-unit">hPa</span>
          </>
        }
      />

      <Tile
        title="Precipitation"
        value={`${details.precipitationNext24h} mm`}
        note="Expected in the next 24 hours."
      />
    </div>
  );
}

export default DetailTiles;
