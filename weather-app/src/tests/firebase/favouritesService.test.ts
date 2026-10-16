import { beforeEach, describe, expect, it, vi } from "vitest";

const { setDocMock, getDocsMock, deleteDocMock } = vi.hoisted(() => ({
  setDocMock: vi.fn(),
  getDocsMock: vi.fn(),
  deleteDocMock: vi.fn(),
}));

// Lightweight fakes: doc/collection just record the path they were given
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({ type: "collection", path: segments.join("/") }),
  doc: (_db: unknown, ...segments: string[]) => ({ type: "doc", path: segments.join("/") }),
  query: (ref: unknown, ...constraints: unknown[]) => ({ type: "query", ref, constraints }),
  orderBy: (field: string, direction: string) => ({ field, direction }),
  serverTimestamp: () => "SERVER_TIMESTAMP",
  setDoc: setDocMock,
  getDocs: getDocsMock,
  deleteDoc: deleteDocMock,
}));

vi.mock("../../firebaseService/firebase", () => ({
  auth: {},
  db: { name: "mock-db" },
}));

import {
  addFavourite,
  getFavourites,
  removeFavourite,
} from "../../firebaseService/favouritesService";

const lagos = { name: "Lagos, Nigeria", latitude: 6.5244, longitude: 3.3792 };
const london = { name: "London, England, United Kingdom", latitude: 51.5074, longitude: -0.1278 };

function fakeSnapshot(items: { id: string; name: string; latitude: number; longitude: number }[]) {
  return {
    docs: items.map((item) => ({
      id: item.id,
      data: () => ({
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        createdAt: "ignored",
      }),
    })),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});


describe("TC-FB-005 favourite locations", () => {
  it("saves a favourite under the user's own path", async () => {
    setDocMock.mockResolvedValue(undefined);

    await addFavourite("user-1", lagos);

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [ref, data] = setDocMock.mock.calls[0];
    expect(ref.path).toBe("users/user-1/favourites/lagos_nigeria");
    expect(data).toEqual({
      name: "Lagos, Nigeria",
      latitude: 6.5244,
      longitude: 3.3792,
      createdAt: "SERVER_TIMESTAMP",
    });
  });

  it("returns the saved favourite with its id", async () => {
    setDocMock.mockResolvedValue(undefined);

    const saved = await addFavourite("user-1", lagos);

    expect(saved).toEqual({ id: "lagos_nigeria", ...lagos });
  });

  it("preserves latitude and longitude exactly, including negatives", async () => {
    setDocMock.mockResolvedValue(undefined);

    await addFavourite("user-1", london);

    const [ref, data] = setDocMock.mock.calls[0];
    expect(ref.path).toBe("users/user-1/favourites/london_united-kingdom");
    expect(data.latitude).toBe(51.5074);
    expect(data.longitude).toBe(-0.1278);
  });

  it("saving the same place twice targets the same document (no duplicates)", async () => {
    setDocMock.mockResolvedValue(undefined);

    await addFavourite("user-1", lagos);
    await addFavourite("user-1", lagos);

    expect(setDocMock.mock.calls[0][0].path).toBe(setDocMock.mock.calls[1][0].path);
  });

  it("retrieves favourites newest first, with coordinates intact", async () => {
    getDocsMock.mockResolvedValue(
      fakeSnapshot([
        { id: "london_united-kingdom", ...london },
        { id: "lagos_nigeria", ...lagos },
      ])
    );

    const favourites = await getFavourites("user-1");

    const queryArg = getDocsMock.mock.calls[0][0];
    expect(queryArg.ref.path).toBe("users/user-1/favourites");
    expect(queryArg.constraints[0]).toEqual({ field: "createdAt", direction: "desc" });

    expect(favourites).toEqual([
      { id: "london_united-kingdom", ...london },
      { id: "lagos_nigeria", ...lagos },
    ]);
  });

  it("returns an empty list when the user has no favourites", async () => {
    getDocsMock.mockResolvedValue(fakeSnapshot([]));

    expect(await getFavourites("user-1")).toEqual([]);
  });

  it("removes a favourite from the user's own path", async () => {
    deleteDocMock.mockResolvedValue(undefined);

    await removeFavourite("user-1", "lagos_nigeria");

    expect(deleteDocMock).toHaveBeenCalledTimes(1);
    expect(deleteDocMock.mock.calls[0][0].path).toBe("users/user-1/favourites/lagos_nigeria");
  });

  it("only touches the signed-in user's data (isolation between users)", async () => {
    setDocMock.mockResolvedValue(undefined);
    getDocsMock.mockResolvedValue(fakeSnapshot([]));

    await addFavourite("user-a", lagos);
    await addFavourite("user-b", lagos);
    await getFavourites("user-b");

    expect(setDocMock.mock.calls[0][0].path).toBe("users/user-a/favourites/lagos_nigeria");
    expect(setDocMock.mock.calls[1][0].path).toBe("users/user-b/favourites/lagos_nigeria");
    expect(getDocsMock.mock.calls[0][0].ref.path).toBe("users/user-b/favourites");
  });

  it("passes Firestore permission errors through to the caller", async () => {
    setDocMock.mockRejectedValue({ code: "permission-denied" });

    await expect(addFavourite("user-1", lagos)).rejects.toEqual({ code: "permission-denied" });
  });
});

describe("TC-FB-006 unauthenticated favourite access", () => {
  it.each([null, undefined, ""])("blocks every operation when uid is %j", async (uid) => {
    const message = "You must be signed in to manage favourites.";

    await expect(addFavourite(uid, lagos)).rejects.toThrow(message);
    await expect(getFavourites(uid)).rejects.toThrow(message);
    await expect(removeFavourite(uid, "lagos_nigeria")).rejects.toThrow(message);

    // Firestore is never contacted
    expect(setDocMock).not.toHaveBeenCalled();
    expect(getDocsMock).not.toHaveBeenCalled();
    expect(deleteDocMock).not.toHaveBeenCalled();
  });
});
