import type { FavouriteLocation } from "../firebaseService/firebaseTypes";
import type { Location } from "../locationService/locationTypes";

interface FavouriteLocationsProps {
  favourites: FavouriteLocation[];
  activeId: string; // the location currently on screen
  onSelect: (location: Location) => void;
  onRemove: (id: string) => void;
}

function FavouriteLocations({ favourites, activeId, onSelect, onRemove }: FavouriteLocationsProps) {
  return (
    <section>
      <h2 className="sidebar-title">Favourites</h2>

      {favourites.length === 0 ? (
        <p className="muted small">No favourites yet. Open a city and tap Save.</p>
      ) : (
        <ul className="favourites">
          {favourites.map((favourite) => (
            <li
              key={favourite.id}
              className={favourite.id === activeId ? "favourite active" : "favourite"}
            >
              <button
                type="button"
                className="favourite-name"
                onClick={() =>
                  onSelect({
                    name: favourite.name,
                    latitude: favourite.latitude,
                    longitude: favourite.longitude,
                  })
                }
              >
                {favourite.name}
              </button>
              <button
                type="button"
                className="favourite-remove"
                aria-label={`Remove ${favourite.name} from favourites`}
                onClick={() => onRemove(favourite.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default FavouriteLocations;
