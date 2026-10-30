import { beforeEach, describe, expect, it, vi } from "vitest";
 
const {
  createUserMock,
  signInMock,
  signOutMock,
  onAuthStateChangedMock,
  signInWithPopupMock,
  getAdditionalUserInfoMock,
  googleProviderMock,
  sendPasswordResetEmailMock,
  deleteUserMock,
  docMock,
  getDocMock,
  setDocMock,
  serverTimestampMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  onAuthStateChangedMock: vi.fn(),
  signInWithPopupMock: vi.fn(),
  getAdditionalUserInfoMock: vi.fn(),
  googleProviderMock: vi.fn(),
  sendPasswordResetEmailMock: vi.fn(),
  deleteUserMock: vi.fn(),
  docMock: vi.fn(),
  getDocMock: vi.fn(),
  setDocMock: vi.fn(),
  serverTimestampMock: vi.fn(),
}));
 
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: googleProviderMock,
  getAdditionalUserInfo: getAdditionalUserInfoMock,
  signInWithPopup: signInWithPopupMock,
  createUserWithEmailAndPassword: createUserMock,
  signInWithEmailAndPassword: signInMock,
  sendPasswordResetEmail: sendPasswordResetEmailMock,
  signOut: signOutMock,
  onAuthStateChanged: onAuthStateChangedMock,
}));
 
vi.mock("firebase/firestore", () => ({
  doc: docMock,
  getDoc: getDocMock,
  setDoc: setDocMock,
  serverTimestamp: serverTimestampMock,
}));
 
// Prevent the real Firebase app from initializing during tests.
vi.mock("../../firebaseService/firebase", () => ({
  auth: { name: "mock-auth" },
  db: {},
  authPersistenceReady: Promise.resolve(),
}));
 
import { auth } from "../../firebaseService/firebase";
import {
  AuthError,
  getAuthErrorMessage,
  logOut,
  sendPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
  subscribeToAuth,
} from "../../firebaseService/authService";
 
const mockAuth = { name: "mock-auth", currentUser: null };
const mockDb = {};
const mockUserRef = { path: "users/abc123" };
 
async function getRejection(
  promise: Promise<unknown>
): Promise<AuthError> {
  try {
    await promise;
  } catch (error) {
    return error as AuthError;
  }
 
  throw new Error("Expected the promise to reject, but it resolved");
}
 
function googleCredential(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      uid: "g123",
      email: "gina@example.com",
      displayName: "Gina Park",
      delete: deleteUserMock,
      ...overrides,
    },
  };
}
 
beforeEach(() => {
  vi.resetAllMocks();
 
  docMock.mockReturnValue(mockUserRef);
  setDocMock.mockResolvedValue(undefined);
  serverTimestampMock.mockReturnValue("mock-timestamp");
 
  getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined });
  signOutMock.mockResolvedValue(undefined);
  deleteUserMock.mockResolvedValue(undefined);
  sendPasswordResetEmailMock.mockResolvedValue(undefined);
  googleProviderMock.mockImplementation(function () {
    return { setCustomParameters: vi.fn() };
  });
 
  (auth as unknown as { currentUser: unknown }).currentUser = null;
 
  // The service logs failures; keep the test output quiet.
  vi.spyOn(console, "error").mockImplementation(() => {});
});
 
describe("TC-FB-001 sign-up success", () => {
  it("creates a user, saves their profile, and returns the Firebase user", async () => {
    const firebaseUser = {
      uid: "abc123",
      email: "new@example.com",
    };
 
    createUserMock.mockResolvedValue({ user: firebaseUser });
 
    const user = await signUp(
      "Jane",
      "Doe",
      "female",
      "new@example.com",
      "secret123"
    );
 
    expect(createUserMock).toHaveBeenCalledWith(
      mockAuth,
      "new@example.com",
      "secret123"
    );
 
    expect(docMock).toHaveBeenCalledWith(
      mockDb,
      "users",
      "abc123"
    );
 
    expect(setDocMock).toHaveBeenCalledWith(mockUserRef, {
      firstName: "Jane",
      lastName: "Doe",
      gender: "female",
      email: "new@example.com",
      createdAt: "mock-timestamp",
    });
 
    expect(user).toEqual(firebaseUser);
  });
 
  it("trims whitespace around the email", async () => {
    createUserMock.mockResolvedValue({
      user: { uid: "abc123", email: "new@example.com" },
    });
 
    await signUp(
      "Jane",
      "Doe",
      "female",
      "  new@example.com  ",
      "secret123"
    );
 
    expect(createUserMock).toHaveBeenCalledWith(
      mockAuth,
      "new@example.com",
      "secret123"
    );
  });
 
  it("rejects missing gender without creating an account", async () => {
    const error = await getRejection(
      signUp("Jane", "Doe", "", "new@example.com", "secret123")
    );
 
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe("auth/missing-gender");
    expect(error.message).toBe("Please select your gender.");
    expect(createUserMock).not.toHaveBeenCalled();
  });
});
 
describe("TC-FB-002 sign-in success", () => {
  it("signs in and returns the Firebase user", async () => {
    const firebaseUser = {
      uid: "abc123",
      email: "user@example.com",
    };
 
    signInMock.mockResolvedValue({ user: firebaseUser });
 
    const user = await signIn("user@example.com", "secret123");
 
    expect(signInMock).toHaveBeenCalledWith(
      mockAuth,
      "user@example.com",
      "secret123"
    );
 
    expect(user).toEqual(firebaseUser);
  });
});
 
describe("TC-FB-003 invalid input and authentication errors", () => {
  it.each([
    ["auth/weak-password", "Password must be at least 6 characters."],
    ["auth/invalid-email", "Please enter a valid email address."],
    [
      "auth/email-already-in-use",
      "An account with this email already exists.",
    ],
    [
      "auth/network-request-failed",
      "Unable to connect. Please check your internet connection.",
    ],
    [
      "auth/operation-not-allowed",
      "Email/password sign-in isn't enabled for this app.",
    ],
    [
      "auth/configuration-not-found",
      "Email/password sign-in isn't enabled for this app.",
    ],
  ])("sign-up maps %s to a friendly message", async (code, message) => {
    createUserMock.mockRejectedValue({ code });
 
    const error = await getRejection(
      signUp("Jane", "Doe", "female", "a@example.com", "pw")
    );
 
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
 
    const error = await getRejection(
      signIn("a@example.com", "wrong")
    );
 
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
    const error = await getRejection(
      signUp("Jane", "Doe", "female", "a@example.com", "")
    );
 
    expect(error.code).toBe("auth/missing-password");
    expect(error.message).toBe("Password is required.");
    expect(createUserMock).not.toHaveBeenCalled();
  });
 
  it("uses a generic message for unknown Firebase codes", async () => {
    signInMock.mockRejectedValue({ code: "auth/something-new" });
 
    const error = await getRejection(
      signIn("a@example.com", "pw")
    );
 
    expect(error.message).toBe("Something went wrong. Please try again.");
  });
 
  it("never leaks raw error text from non-Firebase errors", async () => {
    signInMock.mockRejectedValue(
      new Error("secret internal detail")
    );
 
    const error = await getRejection(
      signIn("a@example.com", "pw")
    );
 
    expect(error.message).toBe("Something went wrong. Please try again.");
    expect(error.message).not.toContain("secret internal detail");
  });
});
 
describe("getAuthErrorMessage", () => {
  it("handles values that are not errors", () => {
    expect(getAuthErrorMessage(null)).toBe(
      "Something went wrong. Please try again."
    );
    expect(getAuthErrorMessage("oops")).toBe(
      "Something went wrong. Please try again."
    );
    expect(getAuthErrorMessage({ code: 42 })).toBe(
      "Something went wrong. Please try again."
    );
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
    signOutMock.mockRejectedValue({
      code: "auth/network-request-failed",
    });
 
    const error = await getRejection(logOut());
 
    expect(error).toBeInstanceOf(AuthError);
    expect(error.message).toBe(
      "Unable to connect. Please check your internet connection."
    );
  });
});
 
describe("TC-FB-004 authentication state observer", () => {
  it("passes the user on sign-in and null on sign-out", () => {
    let firebaseCallback:
      | ((user: unknown) => void)
      | undefined;
 
    const unsubscribeMock = vi.fn();
 
    onAuthStateChangedMock.mockImplementation(
      (_auth, callback) => {
        firebaseCallback = callback;
        return unsubscribeMock;
      }
    );
 
    const appCallback = vi.fn();
    const unsubscribe = subscribeToAuth(appCallback);
 
    expect(onAuthStateChangedMock).toHaveBeenCalledWith(
      mockAuth,
      expect.any(Function)
    );
 
    const user = {
      uid: "abc123",
      email: "user@example.com",
    };
 
    firebaseCallback?.(user);
    expect(appCallback).toHaveBeenLastCalledWith(user);
 
    firebaseCallback?.(null);
    expect(appCallback).toHaveBeenLastCalledWith(null);
    expect(appCallback).toHaveBeenCalledTimes(2);
 
    unsubscribe();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
 
  it("holds back auth changes during a Google sign-in check, then reports the result", async () => {
    let firebaseCallback:
      | ((user: unknown) => void)
      | undefined;
 
    onAuthStateChangedMock.mockImplementation(
      (_auth, callback) => {
        firebaseCallback = callback;
        return vi.fn();
      }
    );
 
    const appCallback = vi.fn();
    subscribeToAuth(appCallback);
 
    let finishPopup: (value: unknown) => void = () => {};
    signInWithPopupMock.mockReturnValue(
      new Promise((resolve) => {
        finishPopup = resolve;
      })
    );
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
 
    const pending = signInWithGoogle("signIn");
 
    // Firebase reports the brand-new account while the check is still running.
    const transientUser = { uid: "g123" };
    firebaseCallback?.(transientUser);
    expect(appCallback).not.toHaveBeenCalled();
 
    finishPopup(googleCredential());
    await getRejection(pending);
 
    // The account was rejected, so the app is told nobody is signed in.
    expect(appCallback).not.toHaveBeenCalledWith(transientUser);
    expect(appCallback).toHaveBeenLastCalledWith(null);
  });
});
 
describe("TC-FB-005 Google sign-up creates the profile", () => {
  it("writes users/{uid} with real fields for a new Google account", async () => {
    signInWithPopupMock.mockResolvedValue(googleCredential());
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
 
    const user = await signInWithGoogle("signUp");
 
    expect(docMock).toHaveBeenCalledWith(mockDb, "users", "g123");
    expect(setDocMock).toHaveBeenCalledWith(mockUserRef, {
      firstName: "Gina",
      lastName: "Park",
      email: "gina@example.com",
      createdAt: "mock-timestamp",
    });
    expect(getDocMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(user.uid).toBe("g123");
  });
 
  it("falls back to the email prefix when Google gives no display name", async () => {
    signInWithPopupMock.mockResolvedValue(
      googleCredential({ displayName: null })
    );
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
 
    await signInWithGoogle("signUp");
 
    expect(setDocMock).toHaveBeenCalledWith(mockUserRef, {
      firstName: "gina",
      lastName: "",
      email: "gina@example.com",
      createdAt: "mock-timestamp",
    });
  });
 
  it("removes the new account and reports a friendly error if the profile cannot be saved", async () => {
    signInWithPopupMock.mockResolvedValue(googleCredential());
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
    setDocMock.mockRejectedValue({ code: "permission-denied" });
 
    const error = await getRejection(signInWithGoogle("signUp"));
 
    expect(deleteUserMock).toHaveBeenCalledTimes(1);
    expect(error.code).toBe("permission-denied");
    expect(error.message).toBe("We couldn't save your profile. Please try again.");
  });
});
 
describe("TC-FB-006 Google sign-in refuses unregistered accounts", () => {
  it("deletes the account Google just created and says to sign up first", async () => {
    signInWithPopupMock.mockResolvedValue(googleCredential());
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
 
    const error = await getRejection(signInWithGoogle("signIn"));
 
    expect(deleteUserMock).toHaveBeenCalledTimes(1);
    expect(setDocMock).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe("auth/account-not-found");
    expect(error.message).toBe(
      "No account found for this Google account. Please sign up first."
    );
  });
 
  it("still reports 'sign up first' if the account could not be deleted", async () => {
    signInWithPopupMock.mockResolvedValue(googleCredential());
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });
    deleteUserMock.mockRejectedValue({ code: "auth/requires-recent-login" });
 
    const error = await getRejection(signInWithGoogle("signIn"));
 
    expect(error.code).toBe("auth/account-not-found");
  });
 
  it("lets an existing account sign in", async () => {
    signInWithPopupMock.mockResolvedValue(googleCredential());
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: false });
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        firstName: "Gina",
        lastName: "Park",
        email: "gina@example.com",
        createdAt: "earlier",
      }),
    });
 
    const user = await signInWithGoogle("signIn");
 
    expect(user.uid).toBe("g123");
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });
 
  it("keeps the popup-closed code so the screen can ignore it", async () => {
    signInWithPopupMock.mockRejectedValue({ code: "auth/popup-closed-by-user" });
 
    const error = await getRejection(signInWithGoogle("signIn"));
 
    expect(error.code).toBe("auth/popup-closed-by-user");
    expect(setDocMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });
});
 
describe("TC-FB-007 existing Google accounts get a missing profile", () => {
  it("creates the profile when users/{uid} does not exist yet", async () => {
    signInWithPopupMock.mockResolvedValue(googleCredential());
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: false });
 
    await signInWithGoogle("signUp");
 
    expect(setDocMock).toHaveBeenCalledWith(
      mockUserRef,
      {
        firstName: "Gina",
        lastName: "Park",
        email: "gina@example.com",
        createdAt: "mock-timestamp",
      },
      { merge: true }
    );
  });
 
  it("keeps existing values and the original createdAt when filling gaps", async () => {
    signInWithPopupMock.mockResolvedValue(googleCredential());
    getAdditionalUserInfoMock.mockReturnValue({ isNewUser: false });
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ firstName: "Georgina", createdAt: "earlier" }),
    });
 
    await signInWithGoogle("signUp");
 
    expect(setDocMock).toHaveBeenCalledWith(
      mockUserRef,
      {
        firstName: "Georgina",
        lastName: "Park",
        email: "gina@example.com",
        createdAt: "earlier",
      },
      { merge: true }
    );
  });
});
 
describe("TC-FB-008 password reset helper", () => {
  it("rejects an empty email without calling Firebase", async () => {
    const error = await getRejection(sendPasswordReset("   "));
 
    expect(error.code).toBe("auth/missing-email");
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();
  });
 
  it("treats an unknown email as success so it cannot be used to probe for accounts", async () => {
    sendPasswordResetEmailMock.mockRejectedValue({ code: "auth/user-not-found" });
 
    await expect(sendPasswordReset("nobody@example.com")).resolves.toBeUndefined();
  });
 
  it("maps other failures to a friendly message", async () => {
    sendPasswordResetEmailMock.mockRejectedValue({ code: "auth/network-request-failed" });
 
    const error = await getRejection(sendPasswordReset("a@example.com"));
 
    expect(error.message).toBe(
      "Unable to connect. Please check your internet connection."
    );
  });
});