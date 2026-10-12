import { useState } from "react";
import type { FormEvent } from "react";
import { getAuthErrorMessage, signIn, signUp } from "../firebaseService/authService";

type Mode = "signIn" | "signUp";

interface AuthScreenProps {
  onContinueAsGuest: () => void;
}

function AuthScreen({ onContinueAsGuest }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signUp") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      // On success the app's auth observer swaps this screen for the weather screen
    } catch (err) {
      console.error("Auth failed, code:", (err as { code?: string }).code, err);
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-icon" aria-hidden="true">
            ⛅
          </div>
          <h1>Weather</h1>
          <p className="muted">Sign in to see your forecast and save favourite places.</p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="auth-tab"
            aria-selected={mode === "signIn"}
            onClick={() => switchMode("signIn")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            className="auth-tab"
            aria-selected={mode === "signUp"}
            onClick={() => switchMode("signUp")}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signUp" ? "At least 6 characters" : "Your password"}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            />
          </label>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Please wait..." : mode === "signIn" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="guest-option">
          <button type="button" className="btn btn-ghost" onClick={onContinueAsGuest}>
            Continue as guest
          </button>
          <p className="muted small">
            Guests can search any city and see the full forecast. Favourite locations are only saved
            to an account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
