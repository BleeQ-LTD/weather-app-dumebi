import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { makeFavouriteId } from "./favouriteId";
import type { Location } from "../locationService/locationTypes";
import type { FavouriteLocation } from "./firebaseTypes";

// Data lives at: users/{uid}/favourites/{favouriteId}
// favouriteId is built from the city and country, so a city can only exist once.

const NOT_SIGNED_IN = "You must be signed in to manage favourites.";

function requireUid(uid: string | null | undefined): string {
  if (!uid) throw new Error(NOT_SIGNED_IN);
  return uid;
}

export { makeFavouriteId };

export async function addFavourite(
  uid: string | null | undefined,
  location: Location
): Promise<FavouriteLocation> {
  const userId = requireUid(uid);
  const id = makeFavouriteId(location);
  const countryCode = location.countryCode ? { countryCode: location.countryCode } : {};

  // Same city -> same document, so saving twice overwrites instead of duplicating
  await setDoc(doc(db, "users", userId, "favourites", id), {
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    ...countryCode,
    createdAt: serverTimestamp(),
  });

  return {
    id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    ...countryCode,
  };
}

export async function getFavourites(
  uid: string | null | undefined
): Promise<FavouriteLocation[]> {
  const userId = requireUid(uid);

  const snapshot = await getDocs(
    query(collection(db, "users", userId, "favourites"), orderBy("createdAt", "desc"))
  );

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      ...(typeof data.countryCode === "string" ? { countryCode: data.countryCode } : {}),
    };
  });
}

export async function removeFavourite(
  uid: string | null | undefined,
  favouriteId: string
): Promise<void> {
  const userId = requireUid(uid);

  await deleteDoc(doc(db, "users", userId, "favourites", favouriteId));
}
