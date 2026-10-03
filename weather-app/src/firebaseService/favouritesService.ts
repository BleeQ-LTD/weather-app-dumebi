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
import type { Location } from "../locationService/locationTypes";
import type { FavouriteLocation } from "./firebaseTypes";

// Data at: users/{uid}/favourites/{favouriteId}

const NOT_SIGNED_IN = "You must be signed in to manage favourites.";

function requireUid(uid: string | null | undefined): string {
  if (!uid) throw new Error(NOT_SIGNED_IN);
  return uid;
}

export function makeFavouriteId(location: Pick<Location, "latitude" | "longitude">): string {
  return `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;
}

export async function addFavourite(
  uid: string | null | undefined,
  location: Location
): Promise<FavouriteLocation> {
  const userId = requireUid(uid);
  const id = makeFavouriteId(location);

  await setDoc(doc(db, "users", userId, "favourites", id), {
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAt: serverTimestamp(),
  });

  return {
    id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
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
