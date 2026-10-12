import { addFavourite, getFavourites, removeFavourite } from "../firebaseService/favouritesService";
import { makeFavouriteId } from "../firebaseService/favouriteId";
import type { FavouriteLocation } from "../firebaseService/firebaseTypes";
import type { Location } from "../locationService/locationTypes";

export interface FavouritesSnapshot {
  owner: string | null; // the account these favourites belong to
  favourites: FavouriteLocation[];
  error: string;
  loaded: boolean; // CHANGED (1/4): true once the first load for this account has finished
}

// What the user did on screen, remembered so a slow initial load can't undo it
type LocalChange = { type: "added"; item: FavouriteLocation } | { type: "removed" };

// Holds one account's favourites. Written without React so the timing rules are easy to test:
//  - switching account resets everything, and results for the old account are discarded
//  - a slow initial load never removes (or resurrects) something changed in the meantime
//  - when two operations on the same place overlap, only the newest one updates the screen
export class FavouritesStore {
  // CHANGED (2/4): initial value includes loaded: false
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
    // CHANGED (3/4): reset loaded when the account changes
    this.update({ owner: uid, favourites: [], error: "", loaded: false });

    if (!uid) return;

    getFavourites(uid)
      .then((loaded) => {
        if (generation !== this.generation) return; // a different account is active now
        // CHANGED (4/4a): mark loaded on success
        this.update({ favourites: this.mergeLocalChanges(loaded), loaded: true });
      })
      .catch((err) => {
        console.error("Loading favourites failed:", err);
        if (generation === this.generation) {
          // CHANGED (4/4b): loaded: true so Save isn't disabled forever after an error
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