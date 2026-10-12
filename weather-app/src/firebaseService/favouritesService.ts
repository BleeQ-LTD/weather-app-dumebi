import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  const ref = doc(db, "users", userId, "favourites", id);

  const favourite: FavouriteLocation = {
    id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
  };

  // Already saved: leave it alone so the original createdAt isn't overwritten
  const existing = await getDoc(ref);
  if (existing.exists()) return favourite;

  await setDoc(ref, {
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAt: serverTimestamp(),
  });

  return favourite;
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
