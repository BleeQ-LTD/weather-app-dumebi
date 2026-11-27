import { beforeEach, describe, expect, it, vi } from "vitest";

const { docMock, getDocMock, updateDocMock, updateProfileMock } = vi.hoisted(() => ({
  docMock: vi.fn(),
  getDocMock: vi.fn(),
  updateDocMock: vi.fn(),
  updateProfileMock: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: docMock,
  getDoc: getDocMock,
  updateDoc: updateDocMock,
}));

// authService is only imported here for AuthError; none of its SDK calls run.
vi.mock("firebase/auth", () => ({ updateProfile: updateProfileMock }));

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
  saveProfileDetails,
  validateProfileDetails,
} from "../../firebaseService/profileService";
import type { User } from "firebase/auth";

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

describe("editing profile details", () => {
  const user = { uid: "g123", displayName: "Old Name" } as unknown as User;

  it("checks the same limits as sign-up", () => {
    expect(validateProfileDetails({ firstName: " ", lastName: "", gender: "female" })).toBe(
      "First name is required."
    );
    expect(validateProfileDetails({ firstName: "A".repeat(51), lastName: "", gender: "female" })).toMatch(
      /50 characters/
    );
    expect(validateProfileDetails({ firstName: "Mebi", lastName: "", gender: "" })).toBe(
      "Please select your gender."
    );
    expect(validateProfileDetails({ firstName: "Mebi", lastName: "", gender: "female" })).toBe("");
  });

  it("saves trimmed details and updates the account name", async () => {
    updateProfileMock.mockResolvedValue(undefined);

    const saved = await saveProfileDetails(user, {
      firstName: "  Dumebi ",
      lastName: " Onwusah ",
      gender: "female",
    });

    expect(saved).toEqual({ firstName: "Dumebi", lastName: "Onwusah", gender: "female" });
    expect(updateDocMock).toHaveBeenCalledWith(mockUserRef, saved);
    expect(updateProfileMock).toHaveBeenCalledWith(user, { displayName: "Dumebi Onwusah" });
  });

  it("does not write anything when the details are invalid", async () => {
    await expect(
      saveProfileDetails(user, { firstName: "", lastName: "", gender: "female" })
    ).rejects.toBeInstanceOf(AuthError);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("still counts as saved if only the account name update fails", async () => {
    updateProfileMock.mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      saveProfileDetails(user, { firstName: "Mebi", lastName: "", gender: "male" })
    ).resolves.toMatchObject({ firstName: "Mebi" });
  });
});
