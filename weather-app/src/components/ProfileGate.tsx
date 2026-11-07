import { useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import CompleteProfileForm from "./CompleteProfileForm";
import { ensureUserProfile } from "../firebaseService/authService";
import { getUserProfile } from "../firebaseService/profileService";

type Status = "checking" | "needs-gender" | "ready" | "error";

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

interface ProfileGateProps {
  user: User;
  children: ReactNode;
}

export default function ProfileGate({ user, children }: ProfileGateProps) {
  const [status, setStatus] = useState<Status>(
    isGoogleUser(user) ? "checking" : "ready"
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isGoogleUser(user)) return;

    let active = true;

    loadProfile(user)
      .then((profile) => {
        if (!active) return;
        setStatus(profile?.gender ? "ready" : "needs-gender");
      })
      .catch((error) => {
        console.error("Loading profile failed:", error);
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [user, attempt]);

  function retry() {
    setStatus("checking");
    setAttempt((current) => current + 1);
  }

  if (status === "checking") {
    return <p className="status">Loading...</p>;
  }

  if (status === "error") {
    return (
      <main className="auth-page">
        <section className="auth-screen">
          <div className="auth-card">
            <div className="auth-brand">
              <h1>Couldn't load your profile</h1>
              <p className="muted">
                Check your connection and try again.
              </p>
            </div>

            <div className="auth-form">
              <button
                className="btn btn-primary"
                type="button"
                onClick={retry}
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (status === "needs-gender") {
    return (
      <CompleteProfileForm
        uid={user.uid}
        onSaved={() => setStatus("ready")}
      />
    );
  }

  return <>{children}</>;
}
