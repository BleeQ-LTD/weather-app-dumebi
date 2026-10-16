import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { FavouritesStore } from "../state/favouritesStore";
import { isSamePlace } from "../firebaseService/favouriteId";
import type { FavouriteLocation } from "../firebaseService/firebaseTypes";
import type { Location } from "../locationService/locationTypes";

// One shared empty list, so `favourites` keeps the same identity between renders
// when the signed-in account does not own the current snapshot
const NO_FAVOURITES: FavouriteLocation[] = [];

export function useFavourites(uid: string | null) {
  const [store] = useState(() => new FavouritesStore());

  useEffect(() => {
    store.setUser(uid);
    return () => store.setUser(null);
  }, [store, uid]);

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const isOwner = snapshot.owner === uid;
  const favourites = isOwner ? snapshot.favourites : NO_FAVOURITES;

  const add = useCallback(
    async (location: Location) => {
      // Already saved (same city and country): do nothing
      if (favourites.some((f) => isSamePlace(f, location))) return;
      await store.add(location);
    },
    [store, favourites]
  );

  const remove = useCallback((id: string) => store.remove(id), [store]);

  return {
    favourites,
    loaded: isOwner && snapshot.loaded,
    error: isOwner ? snapshot.error : "",
    add,
    remove,
  };
}
