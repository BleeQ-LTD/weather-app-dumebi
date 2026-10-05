import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FavouriteLocation } from "../../firebaseService/firebaseTypes";
import type { Location } from "../../locationService/locationTypes";

const { getFavouritesMock, addFavouriteMock, removeFavouriteMock } = vi.hoisted(() => ({
  getFavouritesMock: vi.fn(),
  addFavouriteMock: vi.fn(),
  removeFavouriteMock: vi.fn(),
}));

vi.mock("../../firebaseService/favouritesService", () => ({
  getFavourites: getFavouritesMock,
  addFavourite: addFavouriteMock,
  removeFavourite: removeFavouriteMock,
}));

import { FavouritesStore } from "../../state/favouritesStore";

const lagos: FavouriteLocation = {
  id: "6.5244_3.3792",
  name: "Lagos, Nigeria",
  latitude: 6.5244,
  longitude: 3.3792,
};

const london: FavouriteLocation = {
  id: "51.5074_-0.1278",
  name: "London, United Kingdom",
  latitude: 51.5074,
  longitude: -0.1278,
};

const toLocation = ({ name, latitude, longitude }: FavouriteLocation): Location => ({
  name,
  latitude,
  longitude,
});

const lagosPlace = toLocation(lagos);
const londonPlace = toLocation(london);

// A promise the test resolves by hand, to control exactly when a slow operation finishes
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Lets any pending promise callbacks run
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  getFavouritesMock.mockReset();
  addFavouriteMock.mockReset();
  removeFavouriteMock.mockReset();
  getFavouritesMock.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a slow initial load", () => {
  it("does not remove a favourite that was saved while the load was still running", async () => {
    const slowLoad = deferred<FavouriteLocation[]>();
    getFavouritesMock.mockReturnValue(slowLoad.promise);
    addFavouriteMock.mockResolvedValue(lagos);
    const store = new FavouritesStore();

    store.setUser("user-a");
    await store.add(lagosPlace); // saved before the load answers
    expect(store.getSnapshot().favourites).toEqual([lagos]);

    slowLoad.resolve([]); // the late load doesn't know about the new favourite
    await flush();

    expect(store.getSnapshot().favourites).toEqual([lagos]);
  });

  it("keeps what was loaded and puts the newly saved favourite first", async () => {
    const slowLoad = deferred<FavouriteLocation[]>();
    getFavouritesMock.mockReturnValue(slowLoad.promise);
    addFavouriteMock.mockResolvedValue(lagos);
    const store = new FavouritesStore();

    store.setUser("user-a");
    await store.add(lagosPlace);
    slowLoad.resolve([london]);
    await flush();

    expect(store.getSnapshot().favourites).toEqual([lagos, london]);
  });

  it("does not bring back a favourite that was removed while the load was still running", async () => {
    const slowLoad = deferred<FavouriteLocation[]>();
    getFavouritesMock.mockReturnValue(slowLoad.promise);
    removeFavouriteMock.mockResolvedValue(undefined);
    const store = new FavouritesStore();

    store.setUser("user-a");
    await store.remove(lagos.id);
    slowLoad.resolve([lagos, london]); // the late load still lists the removed place
    await flush();

    expect(store.getSnapshot().favourites).toEqual([london]);
  });
});

describe("switching accounts", () => {
  it("clears the previous account's favourites immediately", async () => {
    getFavouritesMock.mockResolvedValueOnce([lagos]);
    const store = new FavouritesStore();

    store.setUser("user-a");
    await flush();
    expect(store.getSnapshot()).toMatchObject({ owner: "user-a", favourites: [lagos] });

    const slowLoadForB = deferred<FavouriteLocation[]>();
    getFavouritesMock.mockReturnValueOnce(slowLoadForB.promise);
    store.setUser("user-b");

    // Straight away, before account B's data has arrived
    expect(store.getSnapshot()).toMatchObject({ owner: "user-b", favourites: [] });

    slowLoadForB.resolve([london]);
    await flush();
    expect(store.getSnapshot().favourites).toEqual([london]);
  });

  it("ignores a slow load that belongs to the previous account", async () => {
    const loadForA = deferred<FavouriteLocation[]>();
    const loadForB = deferred<FavouriteLocation[]>();
    getFavouritesMock.mockReturnValueOnce(loadForA.promise).mockReturnValueOnce(loadForB.promise);
    const store = new FavouritesStore();

    store.setUser("user-a");
    store.setUser("user-b");
    loadForB.resolve([london]);
    await flush();
    loadForA.resolve([lagos]); // account A's answer arrives last
    await flush();

    expect(store.getSnapshot()).toMatchObject({ owner: "user-b", favourites: [london] });
  });

  it("does not add a favourite saved for the previous account to the new account", async () => {
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();

    const slowSave = deferred<FavouriteLocation>();
    addFavouriteMock.mockReturnValue(slowSave.promise);
    const saving = store.add(lagosPlace);

    store.setUser("user-b");
    await flush();
    slowSave.resolve(lagos);
    await saving;

    expect(addFavouriteMock).toHaveBeenCalledWith("user-a", lagosPlace);
    expect(store.getSnapshot()).toMatchObject({ owner: "user-b", favourites: [] });
  });

  it("does not show an old account's failed save as an error on the new account", async () => {
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();

    const slowSave = deferred<FavouriteLocation>();
    addFavouriteMock.mockReturnValue(slowSave.promise);
    const saving = store.add(lagosPlace);

    store.setUser("user-b");
    slowSave.reject(new Error("permission-denied"));
    await saving;

    expect(store.getSnapshot().error).toBe("");
  });

  it("shows nothing, and loads nothing, when signed out", async () => {
    getFavouritesMock.mockResolvedValue([lagos]);
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();
    getFavouritesMock.mockClear();

    store.setUser(null);
    await store.add(lagosPlace);
    await store.remove(lagos.id);

    expect(store.getSnapshot()).toEqual({ owner: null, favourites: [], error: "" });
    expect(getFavouritesMock).not.toHaveBeenCalled();
    expect(addFavouriteMock).not.toHaveBeenCalled();
    expect(removeFavouriteMock).not.toHaveBeenCalled();
  });
});

describe("overlapping operations on the same place", () => {
  it("an older save that finishes late does not undo a newer removal", async () => {
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();

    const slowSave = deferred<FavouriteLocation>();
    addFavouriteMock.mockReturnValue(slowSave.promise);
    removeFavouriteMock.mockResolvedValue(undefined);

    const saving = store.add(lagosPlace);
    await store.remove(lagos.id); // started later, finishes first
    slowSave.resolve(lagos);
    await saving;

    expect(store.getSnapshot().favourites).toEqual([]);
  });

  it("an older removal that finishes late does not delete a newer save", async () => {
    getFavouritesMock.mockResolvedValue([lagos]);
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();

    const slowRemoval = deferred<void>();
    removeFavouriteMock.mockReturnValue(slowRemoval.promise);
    addFavouriteMock.mockResolvedValue(lagos);

    const removing = store.remove(lagos.id);
    await store.add(lagosPlace); // started later, finishes first
    slowRemoval.resolve();
    await removing;

    expect(store.getSnapshot().favourites).toEqual([lagos]);
  });
});

describe("normal use", () => {
  it("adds the newest first, replaces a place saved twice, and removes", async () => {
    addFavouriteMock.mockImplementation(async (_uid: string, location: Location) => ({
      id: location.latitude === lagos.latitude ? lagos.id : london.id,
      ...location,
    }));
    removeFavouriteMock.mockResolvedValue(undefined);
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();

    await store.add(lagosPlace);
    await store.add(londonPlace);
    expect(store.getSnapshot().favourites.map((f) => f.id)).toEqual([london.id, lagos.id]);

    await store.add(lagosPlace); // saved again: moves to the front, no duplicate
    expect(store.getSnapshot().favourites.map((f) => f.id)).toEqual([lagos.id, london.id]);

    await store.remove(london.id);
    expect(store.getSnapshot().favourites.map((f) => f.id)).toEqual([lagos.id]);
  });

  it("loads the signed-in account's favourites", async () => {
    getFavouritesMock.mockResolvedValue([lagos, london]);
    const store = new FavouritesStore();

    store.setUser("user-a");
    await flush();

    expect(getFavouritesMock).toHaveBeenCalledWith("user-a");
    expect(store.getSnapshot()).toEqual({
      owner: "user-a",
      favourites: [lagos, london],
      error: "",
    });
  });
});

describe("errors", () => {
  it("reports a failed load", async () => {
    getFavouritesMock.mockRejectedValue(new Error("offline"));
    const store = new FavouritesStore();

    store.setUser("user-a");
    await flush();

    expect(store.getSnapshot().error).toBe("Could not load your favourites.");
    expect(store.getSnapshot().favourites).toEqual([]);
  });

  it("a failed save leaves the list unchanged and reports it", async () => {
    addFavouriteMock.mockRejectedValue(new Error("permission-denied"));
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();

    await store.add(lagosPlace);

    expect(store.getSnapshot().favourites).toEqual([]);
    expect(store.getSnapshot().error).toBe("Could not save this location. Please try again.");
  });

  it("a failed removal keeps the favourite and reports it", async () => {
    getFavouritesMock.mockResolvedValue([lagos]);
    removeFavouriteMock.mockRejectedValue(new Error("offline"));
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();

    await store.remove(lagos.id);

    expect(store.getSnapshot().favourites).toEqual([lagos]);
    expect(store.getSnapshot().error).toBe("Could not remove this location. Please try again.");
  });

  it("clears the error when the next operation succeeds", async () => {
    addFavouriteMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(lagos);
    const store = new FavouritesStore();
    store.setUser("user-a");
    await flush();

    await store.add(lagosPlace);
    expect(store.getSnapshot().error).not.toBe("");

    await store.add(lagosPlace);
    expect(store.getSnapshot().error).toBe("");
    expect(store.getSnapshot().favourites).toEqual([lagos]);
  });
});

describe("subscriptions (what React relies on)", () => {
  it("tells listeners when something changes, and stops after unsubscribing", () => {
    const store = new FavouritesStore();
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    store.setUser("user-a");
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    unsubscribe();
    store.setUser("user-b");
    expect(listener).not.toHaveBeenCalled();
  });

  it("returns the same snapshot object until something changes", () => {
    const store = new FavouritesStore();
    const first = store.getSnapshot();

    expect(store.getSnapshot()).toBe(first);

    store.setUser(null);
    expect(store.getSnapshot()).not.toBe(first);
  });
});
