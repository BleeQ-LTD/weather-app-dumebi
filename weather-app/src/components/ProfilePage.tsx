
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  GENDER_OPTIONS,
  getUserProfile,
  saveTemperatureUnit,
  type TemperatureUnit,
  type UserProfile,
} from "../firebaseService/profileService";
import { logOut } from "../firebaseService/authService";
import ForgotPasswordForm from "./ForgotPasswordForm";

interface ProfilePageProps {
  user: User;
  onBack: () => void;
}

export default function ProfilePage({
  user,
  onBack,
}: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingUnit, setSavingUnit] = useState(false);
  const [error, setError] = useState("");
  const [unitMessage, setUnitMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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

  async function handleUnitChange(unit: TemperatureUnit) {
    setError("");
    setUnitMessage("");
    setSavingUnit(true);

    try {
      await saveTemperatureUnit(user.uid, unit);

      setProfile((previous) =>
        previous ? { ...previous, temperatureUnit: unit } : previous,
      );

      setUnitMessage("Temperature preference saved.");
    } catch (err) {
      console.error("Unable to save temperature preference:", err);
      setError("Unable to save your temperature preference.");
    } finally {
      setSavingUnit(false);
    }
  }

  async function handleSignOut() {
    try {
      await logOut();
    } catch (err) {
      console.error("Sign out failed:", err);
      setError("Unable to sign out. Please try again.");
    }
  }

  if (showForgotPassword) {
    return (
      <ForgotPasswordForm
        onBack={() => setShowForgotPassword(false)}
      />
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-icon" aria-hidden="true">
              👤
            </div>
            <h1>Your Profile</h1>
            <p className="muted">
              Manage your account and weather preferences.
            </p>
          </div>

          {loading ? (
            <p className="status">Loading your profile...</p>
          ) : (
            <div className="auth-form">
              <div className="field">
                <label>First name</label>
                <input
                  type="text"
                  value={profile?.firstName || "Not provided"}
                  readOnly
                />
              </div>

              <div className="field">
                <label>Last name</label>
                <input
                  type="text"
                  value={profile?.lastName || "Not provided"}
                  readOnly
                />
              </div>

              <div className="field">
                <label>Gender</label>
                <input
                  type="text"
                  value={
                    GENDER_OPTIONS.find(
                      (option) => option.value === profile?.gender,
                    )?.label || "Not provided"
                  }
                  readOnly
                />
              </div>

              <div className="field">
                <label>Email address</label>
                <input
                  type="email"
                  value={user.email || "Not available"}
                  readOnly
                />
              </div>

              <div className="field">
                <label htmlFor="temperature-unit">
                  Temperature preference
                </label>

                <select
                  id="temperature-unit"
                  value={profile?.temperatureUnit || "celsius"}
                  onChange={(event) =>
                    handleUnitChange(
                      event.target.value as TemperatureUnit,
                    )
                  }
                  disabled={savingUnit || !profile}
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>

                {savingUnit && (
                  <span className="muted small">Saving preference...</span>
                )}

                {unitMessage && (
                  <span className="success-text" role="status">
                    {unitMessage}
                  </span>
                )}
              </div>

              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}

              <button
                type="button"
                className="auth-forgot-link"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot password?
              </button>

              <button
                type="button"
                className="btn btn-ghost"
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
      </section>
    </main>
  );
}
