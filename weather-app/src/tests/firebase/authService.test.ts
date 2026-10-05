import { beforeEach, describe, expect, it, vi } from "vitest";

const { createUserMock, signInMock, signOutMock, onAuthStateChangedMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  onAuthStateChangedMock: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: createUserMock,
  signInWithEmailAndPassword: signInMock,
  signOut: signOutMock,
  onAuthStateChanged: onAuthStateChangedMock,
}));

// Stops the real Firebase app from initialising during tests
vi.mock("../../firebaseService/firebase", () => ({
  auth: { name: "mock-auth" },
  db: {},
}));

import {
  AuthError,
  getAuthErrorMessage,
  logOut,
  signIn,
  signUp,
  subscribeToAuth,
} from "../../firebaseService/authService";

const mockAuth = { name: "mock-auth" };

// Returns the error a promise rejects with, so we can inspect its code and message
async function getRejection(promise: Promise<unknown>): Promise<AuthError> {
  try {
    await promise;
  } catch (error) {
    return error as AuthError;
  }
  throw new Error("Expected the promise to reject, but it resolved");
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("TC-FB-001 sign-up success", () => {
  it("creates a user and returns the Firebase user", async () => {
    const firebaseUser = { uid: "abc123", email: "new@example.com" };
    createUserMock.mockResolvedValue({ user: firebaseUser });

    const user = await signUp("new@example.com", "secret123");

    expect(createUserMock).toHaveBeenCalledWith(mockAuth, "new@example.com", "secret123");
    expect(user).toEqual(firebaseUser);
  });

  it("trims whitespace around the email", async () => {
    createUserMock.mockResolvedValue({ user: { uid: "abc123" } });

    await signUp("  new@example.com  ", "secret123");

    expect(createUserMock).toHaveBeenCalledWith(mockAuth, "new@example.com", "secret123");
  });
});

describe("TC-FB-002 sign-in success", () => {
  it("signs in and returns the Firebase user", async () => {
    const firebaseUser = { uid: "abc123", email: "user@example.com" };
    signInMock.mockResolvedValue({ user: firebaseUser });

    const user = await signIn("user@example.com", "secret123");

    expect(signInMock).toHaveBeenCalledWith(mockAuth, "user@example.com", "secret123");
    expect(user).toEqual(firebaseUser);
  });
});

describe("TC-FB-003 invalid input and authentication errors", () => {
  it.each([
    ["auth/weak-password", "Password must be at least 6 characters."],
    ["auth/invalid-email", "Please enter a valid email address."],
    ["auth/email-already-in-use", "An account with this email already exists."],
    ["auth/network-request-failed", "Unable to connect. Please check your internet connection."],
    ["auth/operation-not-allowed", "Email/password sign-in isn't enabled for this app."],
    ["auth/configuration-not-found", "Email/password sign-in isn't enabled for this app."],
  ])("sign-up maps %s to a friendly message", async (code, message) => {
    createUserMock.mockRejectedValue({ code });

    const error = await getRejection(signUp("a@example.com", "pw"));

    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
  });

  it.each([
    "auth/wrong-password",
    "auth/user-not-found",
    "auth/invalid-credential",
  ])("sign-in maps %s to 'Incorrect email or password.'", async (code) => {
    signInMock.mockRejectedValue({ code });

    const error = await getRejection(signIn("a@example.com", "wrong"));

    expect(error.code).toBe(code);
    expect(error.message).toBe("Incorrect email or password.");
  });

  it("rejects an empty email without calling Firebase", async () => {
    const error = await getRejection(signIn("   ", "secret123"));

    expect(error.code).toBe("auth/missing-email");
    expect(error.message).toBe("Email is required.");
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("rejects an empty password without calling Firebase", async () => {
    const error = await getRejection(signUp("a@example.com", ""));

    expect(error.code).toBe("auth/missing-password");
    expect(error.message).toBe("Password is required.");
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("uses a generic message for unknown Firebase codes", async () => {
    signInMock.mockRejectedValue({ code: "auth/something-new" });

    const error = await getRejection(signIn("a@example.com", "pw"));

    expect(error.message).toBe("Something went wrong. Please try again.");
  });

  it("never leaks raw error text from non-Firebase errors", async () => {
    signInMock.mockRejectedValue(new Error("secret internal detail"));

    const error = await getRejection(signIn("a@example.com", "pw"));

    expect(error.message).toBe("Something went wrong. Please try again.");
    expect(error.message).not.toContain("secret internal detail");
  });
});

describe("getAuthErrorMessage", () => {
  it("handles values that are not errors", () => {
    expect(getAuthErrorMessage(null)).toBe("Something went wrong. Please try again.");
    expect(getAuthErrorMessage("oops")).toBe("Something went wrong. Please try again.");
    expect(getAuthErrorMessage({ code: 42 })).toBe("Something went wrong. Please try again.");
  });

  it("returns too-many-requests message", () => {
    expect(getAuthErrorMessage({ code: "auth/too-many-requests" })).toBe(
      "Too many attempts. Please try again later."
    );
  });
});

describe("logOut", () => {
  it("signs the current user out", async () => {
    signOutMock.mockResolvedValue(undefined);

    await logOut();

    expect(signOutMock).toHaveBeenCalledWith(mockAuth);
  });

  it("wraps sign-out failures in an AuthError", async () => {
    signOutMock.mockRejectedValue({ code: "auth/network-request-failed" });

    const error = await getRejection(logOut());

    expect(error).toBeInstanceOf(AuthError);
    expect(error.message).toBe("Unable to connect. Please check your internet connection.");
  });
});

describe("TC-FB-004 authentication state observer", () => {
  it("passes the user on sign-in and null on sign-out", () => {
    let firebaseCallback: ((user: unknown) => void) | undefined;
    const unsubscribeMock = vi.fn();

    onAuthStateChangedMock.mockImplementation((_auth, callback) => {
      firebaseCallback = callback;
      return unsubscribeMock;
    });

    const appCallback = vi.fn();
    const unsubscribe = subscribeToAuth(appCallback);

    expect(onAuthStateChangedMock).toHaveBeenCalledWith(mockAuth, expect.any(Function));

    const user = { uid: "abc123", email: "user@example.com" };
    firebaseCallback?.(user);
    expect(appCallback).toHaveBeenLastCalledWith(user);

    firebaseCallback?.(null);
    expect(appCallback).toHaveBeenLastCalledWith(null);
    expect(appCallback).toHaveBeenCalledTimes(2);

    // The returned function stops listening
    expect(unsubscribe).toBe(unsubscribeMock);
  });
});
