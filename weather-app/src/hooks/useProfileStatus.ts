import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ensureUserProfile } from "../firebaseService/authService";
import { getUserProfile } from "../firebaseService/profileService";

export type ProfileStatus = "none" | "checking" | "needs-gender" | "ready" | "error";

// Only Google accounts can be missing a gender: email sign-up always asks for
// it, so those accounts go straight through without an extra read.
function isGoogleUser(user: User): boolean {
  return user.providerData.some(
    (provider) => provider.providerId === "google.com"
  );
}

async function loadProfile(user: User) {
  let profile = await getUserProfile(user.uid);

  // A Google account with no users/{uid} document yet: create it first.
  if (!profile) {
    await ensureUserProfile(user);
    profile = await getUserProfile(user.uid);
  }

  return profile;
}

// Whether the signed-in account is fully set up. The weather keeps showing
// either way; "needs-gender" and "error" show an overlay on top of it.
export function useProfileStatus(user: User | null) {
  const [state, setState] = useState<{ uid: string | null; status: ProfileStatus }>({
    uid: null,
    status: "none",
  });
  const [attempt, setAttempt] = useState(0);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!user) return;
    if (!isGoogleUser(user)) {
      setState({ uid: user.uid, status: "ready" });
      return;
    }

    let active = true;
    setState({ uid: user.uid, status: "checking" });

    loadProfile(user)
      .then((profile) => {
        if (active) setState({ uid: user.uid, status: profile?.gender ? "ready" : "needs-gender" });
      })
      .catch((error) => {
        console.error("Loading profile failed:", error);
        if (active) setState({ uid: user.uid, status: "error" });
      });

    return () => {
      active = false;
    };
  }, [user, attempt]);

  // Results for an earlier account don't count
  const status: ProfileStatus = !uid ? "none" : state.uid === uid ? state.status : "checking";

  return {
    status,
    retry: () => setAttempt((current) => current + 1),
    markReady: () => setState({ uid, status: "ready" }),
  };
}
