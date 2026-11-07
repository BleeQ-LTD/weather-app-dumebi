import { beforeEach, describe, expect, it, vi } from "vitest";

const { docMock, getDocMock, updateDocMock } = vi.hoisted(() => ({
  docMock: vi.fn(),
  getDocMock: vi.fn(),
  updateDocMock: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: docMock,
  getDoc: getDocMock,
  updateDoc: updateDocMock,
}));

// authService is only imported here for AuthError; none of its SDK calls run.
vi.mock("firebase/auth", () => ({}));

// Prevent the real Firebase app from initializing during tests.
vi.mock("../../firebaseService/firebase", () => ({
  auth: { name: "mock-auth" },
  db: {},
  authPersistenceReady: Promise.resolve(),
}));

import { AuthError } from "../../firebaseService/authService";
import {
  GENDER_OPTIONS,
  getUserProfile,
  saveGender,
} from "../../firebaseService/profileService";

const mockDb = {};
const mockUserRef = { path: "users/g123" };

beforeEach(() => {
  vi.resetAllMocks();

  docMock.mockReturnValue(mockUserRef);
  updateDocMock.mockResolvedValue(undefined);
});

describe("TC-PRO-001 reading a profile", () => {
  it("returns null when users/{uid} does not exist", async () => {
    getDocMock.mockResolvedValue({ exists: () => false });

    expect(await getUserProfile("g123")).toBeNull();
    expect(docMock).toHaveBeenCalledWith(mockDb, "users", "g123");
  });

  it("returns the names and gender", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstName: "Gina", lastName: "Park", gender: "female" }),
    });

    expect(await getUserProfile("g123")).toEqual({
      firstName: "Gina",
      lastName: "Park",
      gender: "female",
      temperatureUnit: "celsius",
    });
  });

  it("treats a missing or empty gender as not chosen yet", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstName: "Gina", lastName: "", gender: "" }),
    });

    expect((await getUserProfile("g123"))?.gender).toBeUndefined();
  });
});

describe("TC-PRO-002 saving gender", () => {
  it.each(GENDER_OPTIONS.map((option) => option.value))(
    "saves %s on the user's own document",
    async (gender) => {
      await saveGender("g123", gender);

      expect(docMock).toHaveBeenCalledWith(mockDb, "users", "g123");
      expect(updateDocMock).toHaveBeenCalledWith(mockUserRef, { gender });
    }
  );

  it("rejects an empty or unknown value without writing", async () => {
    for (const value of ["", "something-else"]) {
      let caught: unknown;

      try {
        await saveGender("g123", value);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(AuthError);
      expect((caught as AuthError).message).toBe("Please select your gender.");
    }

    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("does not swallow a failed write", async () => {
    updateDocMock.mockRejectedValue({ code: "permission-denied" });

    await expect(saveGender("g123", "female")).rejects.toEqual({
      code: "permission-denied",
    });
  });
});
