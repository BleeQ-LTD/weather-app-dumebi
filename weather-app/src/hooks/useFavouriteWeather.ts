import { useEffect, useState } from "react";
import { getFavouritesWeather } from "../weatherService/favouriteWeather";
import type { FavouriteWeather } from "../weatherService/favouriteWeather";
import type { FavouriteLocation } from "../firebaseService/firebaseTypes";

// Current weather for each Favourite, keyed by Favourite id. It loads when the
// component using it appears, which is when the list is opened.
export function useFavouriteWeather(favourites: FavouriteLocation[]) {
  const [byId, setById] = useState<Record<string, FavouriteWeather>>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (favourites.length === 0) return;

    let cancelled = false;

    getFavouritesWeather(favourites)
      .then((results) => {
        if (cancelled) return;

        const next: Record<string, FavouriteWeather> = {};
        favourites.forEach((favourite, index) => {
          const weather = results[index];
          if (weather) next[favourite.id] = weather;
        });

        setById(next);
        setFailed(false);
      })
      .catch((error) => {
        console.error("Favourite weather failed:", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [favourites]);

  return { byId, failed };
}
