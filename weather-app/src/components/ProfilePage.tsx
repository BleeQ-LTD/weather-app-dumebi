
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  getUserProfile,
  type UserProfile,
} from "../firebaseService/profileService";
import { logOut } from "../firebaseService/authService";
import ForgotPasswordForm from "./ForgotPasswordForm";
import Overlay from "./Overlay";
import AnimatedSwap from "./AnimatedSwap";
import SetPasswordForm from "./SetPasswordForm";
import ProfileDetailsForm from "./ProfileDetailsForm";
import { hasPassword } from "../firebaseService/passwordLink";

interface ProfilePageProps {
  user: User;
  onBack: () => void;
  // Name changed: lets the app redraw the sidebar's account name
  onProfileSaved?: () => void;
}

export default function ProfilePage({
  user,
  onBack,
  onProfileSaved,
}: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // "profile", "forgot" (has a password) or "setPassword" (Google-only account)
  const [view, setView] = useState<"profile" | "forgot" | "setPassword">("profile");
  // Google-only accounts have no password until they set one here
  const [passwordSet, setPasswordSet] = useState(() => hasPassword(user));

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const result = await getUserProfile(user.uid);

        if (active) {
          setProfile(result);
        }
      } catch (err) {
        console.error("Unable to load profile:", err);

        if (active) {
          setError("Unable to load your profile. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user.uid]);

  async function handleSignOut() {
    try {
      await logOut();
    } catch (err) {
      console.error("Sign out failed:", err);
      setError("Unable to sign out. Please try again.");
    }
  }

  return (
    <Overlay label="Your profile" onClose={onBack}>
      <AnimatedSwap viewKey={view}>
        {view === "forgot" ? (
          <ForgotPasswordForm
            onBack={() => setView("profile")}
            backLabel="Back to profile"
          />
        ) : view === "setPassword" ? (
          <SetPasswordForm
            user={user}
            onBack={() => setView("profile")}
            onDone={() => setPasswordSet(true)}
          />
        ) : (
    <div className="auth-panel">
          <div className="auth-brand">
            <div className="auth-icon" aria-hidden="true">
              👤
            </div>
            <h1>Your Profile</h1>
            <p className="muted">
              Update your details and manage your account.
            </p>
          </div>

          {loading ? (
            <p className="status">Loading your profile...</p>
          ) : (
            <div className="auth-form">
              <ProfileDetailsForm
                user={user}
                profile={profile}
                onSaved={(details) => {
                  setProfile((current) => (current ? { ...current, ...details } : current));
                  onProfileSaved?.();
                }}
              />

              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}

              {passwordSet ? (
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => setView("forgot")}
                >
                  Forgot password?
                </button>
              ) : (
                <div className="profile-set-password">
                  <p className="muted small">
                    You sign in with Google. Add a password to also sign in with your email.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setView("setPassword")}
                  >
                    Set a password
                  </button>
                </div>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSignOut}
              >
                Sign out
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onBack}
              >
                Back to Weather
              </button>
            </div>
          )}
    </div>
        )}
      </AnimatedSwap>
    </Overlay>
  );
}
