import { addFavourite, getFavourites, removeFavourite } from "../firebaseService/favouritesService";
import { isSamePlace, makeFavouriteId } from "../firebaseService/favouriteId";
import type { FavouriteLocation } from "../firebaseService/firebaseTypes";
import type { Location } from "../locationService/locationTypes";

export interface FavouritesSnapshot {
  owner: string | null; // the account these favourites belong to
  favourites: FavouriteLocation[];
  error: string;
  loaded: boolean; // true once the first load for this account has finished
}

// What the user did on screen, remembered so a slow initial load can't undo it
type LocalChange = { type: "added"; item: FavouriteLocation } | { type: "removed" };

// Older accounts may hold several saves of the same city (from before one city
// became one document). Keep the newest of each and report the rest.
function splitDuplicates(items: FavouriteLocation[]): {
  kept: FavouriteLocation[];
  extras: FavouriteLocation[];
} {
  const kept: FavouriteLocation[] = [];
  const extras: FavouriteLocation[] = [];

  for (const item of items) {
    (kept.some((k) => isSamePlace(k, item)) ? extras : kept).push(item);
  }
  return { kept, extras };
}

// Holds one account's favourites. Written without React so the timing rules are easy to test:
//  - switching account resets everything, and results for the old account are discarded
//  - a slow initial load never removes (or resurrects) something changed in the meantime
//  - when two operations on the same place overlap, only the newest one updates the screen
export class FavouritesStore {
  private snapshot: FavouritesSnapshot = { owner: null, favourites: [], error: "", loaded: false };
  private listeners = new Set<() => void>();
  private generation = 0; // bumped on every account change
  private uid: string | null = null;
  private operationCount = 0;
  private latestOperation = new Map<string, number>(); // newest operation number per place
  private localChanges = new Map<string, LocalChange>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): FavouritesSnapshot => this.snapshot;

  private update(changes: Partial<FavouritesSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...changes };
    this.listeners.forEach((listener) => listener());
  }

  // Call with the signed-in account's id, or null when signed out
  setUser(uid: string | null): void {
    this.generation += 1;
    const generation = this.generation;

    this.uid = uid;
    this.latestOperation.clear();
    this.localChanges.clear();
    this.update({ owner: uid, favourites: [], error: "", loaded: false });

    if (!uid) return;

    getFavourites(uid)
      .then((loaded) => {
        if (generation !== this.generation) return; // a different account is active now

        const { kept, extras } = splitDuplicates(this.mergeLocalChanges(loaded));
        this.update({ favourites: kept, loaded: true });

        // One-time tidy-up of old duplicates; failures are harmless (retried next load)
        extras.forEach((extra) => {
          removeFavourite(uid, extra.id).catch((err) =>
            console.error("Removing duplicate favourite failed:", err)
          );
        });
      })
      .catch((err) => {
        console.error("Loading favourites failed:", err);
        if (generation === this.generation) {
          // loaded: true so the Save button isn't disabled forever after an error
          this.update({ error: "Could not load your favourites.", loaded: true });
        }
      });
  }

  async add(location: Location): Promise<void> {
    const uid = this.uid;
    if (!uid) return;

    const generation = this.generation;
    const id = makeFavouriteId(location);
    const operation = this.startOperation(id);

    if (this.snapshot.error) this.update({ error: "" });

    try {
      const saved = await addFavourite(uid, location);
      if (!this.isCurrent(generation, id, operation)) return;

      this.localChanges.set(id, { type: "added", item: saved });
      this.update({
        favourites: [saved, ...this.snapshot.favourites.filter((f) => f.id !== id)],
      });
    } catch (err) {
      console.error("Saving favourite failed:", err);
      if (generation === this.generation) {
        this.update({ error: "Could not save this location. Please try again." });
      }
    }
  }

  async remove(id: string): Promise<void> {
    const uid = this.uid;
    if (!uid) return;

    const generation = this.generation;
    const operation = this.startOperation(id);

    if (this.snapshot.error) this.update({ error: "" });

    try {
      await removeFavourite(uid, id);
      if (!this.isCurrent(generation, id, operation)) return;

      this.localChanges.set(id, { type: "removed" });
      this.update({ favourites: this.snapshot.favourites.filter((f) => f.id !== id) });
    } catch (err) {
      console.error("Removing favourite failed:", err);
      if (generation === this.generation) {
        this.update({ error: "Could not remove this location. Please try again." });
      }
    }
  }

  private startOperation(id: string): number {
    this.operationCount += 1;
    this.latestOperation.set(id, this.operationCount);
    return this.operationCount;
  }

  // Still the same account, and no newer operation has touched this place since
  private isCurrent(generation: number, id: string, operation: number): boolean {
    return generation === this.generation && this.latestOperation.get(id) === operation;
  }

  // The initial load may have been requested before the user's own changes were saved
  private mergeLocalChanges(loaded: FavouriteLocation[]): FavouriteLocation[] {
    const merged = loaded.filter((f) => this.localChanges.get(f.id)?.type !== "removed");

    this.localChanges.forEach((change, id) => {
      if (change.type === "added" && !merged.some((f) => f.id === id)) {
        merged.unshift(change.item);
      }
    });

    return merged;
  }
}
