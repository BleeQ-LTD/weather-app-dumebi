import { useCallback, useEffect, useState } from "react";
import {
  addFavourite,
  getFavourites,
  removeFavourite,
} from "../firebaseService/favouritesService";
import type { FavouriteLocation } from "../firebaseService/firebaseTypes";
import type { Location } from "../locationService/locationTypes";

export function useFavourites(uid: string) {
  const [favourites, setFavourites] = useState<FavouriteLocation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getFavourites(uid)
      .then((items) => {
        if (!cancelled) setFavourites(items);
      })
      .catch((err) => {
        console.error("Loading favourites failed:", err);
        if (!cancelled) setError("Could not load your favourites.");
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const add = useCallback(
    async (location: Location) => {
      setError("");
      try {
        const saved = await addFavourite(uid, location);
        setFavourites((prev) => [saved, ...prev.filter((f) => f.id !== saved.id)]);
      } catch (err) {
        console.error("Saving favourite failed:", err);
        setError("Could not save this location. Please try again.");
      }
    },
    [uid]
  );

  const remove = useCallback(
    async (id: string) => {
      setError("");
      try {
        await removeFavourite(uid, id);
        setFavourites((prev) => prev.filter((f) => f.id !== id));
      } catch (err) {
        console.error("Removing favourite failed:", err);
        setError("Could not remove this location. Please try again.");
      }
    },
    [uid]
  );

  return { favourites, error, add, remove };
}
