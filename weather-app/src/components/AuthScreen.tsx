import { useState } from "react";
import type { FormEvent } from "react";
import {
  getAuthErrorMessage,
  signIn,
  signUp,
} from "../firebaseService/authService";
import type { GoogleAuthMode } from "../firebaseService/authService";

type Mode = "signIn" | "signUp";

interface AuthScreenProps {
  onContinueAsGuest: () => void;
  onForgotPassword?: () => void;
  onGoogleSignIn?: (mode: GoogleAuthMode) => void;
  googleBusy?: boolean;
  googleError?: string;
}

function AuthScreen({
  onContinueAsGuest,
  onForgotPassword,
  onGoogleSignIn,
  googleBusy = false,
  googleError = "",
}: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("signIn");

  const [gender, setGender] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Keep each form's credentials independent.
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signUp") {
        // Read the current input values as a fallback for browser autofill.
        const formData = new FormData(event.currentTarget);
        const email =
          signUpEmail.trim() ||
          String(formData.get("email") ?? "").trim();
        const password =
          signUpPassword ||
          String(formData.get("new-password") ?? "");

        if (!email) {
          setError("Please enter your email address.");
          return;
        }

        await signUp(
          firstName,
          lastName,
          gender,
          email,
          password
        );
      } else {
        const formData = new FormData(event.currentTarget);
        const email =
          signInEmail.trim() ||
          String(formData.get("username") ?? "").trim();
        const password =
          signInPassword ||
          String(formData.get("password") ?? "");

        if (!email) {
          setError("Please enter your email address.");
          return;
        }

        await signIn(email, password);
      }

      // The app's auth observer handles the transition after authentication.
    } catch (err) {
      console.error(
        "Auth failed, code:",
        (err as { code?: string }).code,
        err
      );
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
          <p className="muted">
            Sign in to see your forecast and save favourite places.
          </p>
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

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          autoComplete="on"
        >
          {mode === "signUp" && (
            <>
              <label className="field">
                First name
                <input
                  type="text"
                  name="given-name"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  placeholder="Your first name"
                  autoComplete="given-name"
                  maxLength={50}
                  required
                />
              </label>

              <label className="field">
                Last name
                <input
                  type="text"
                  name="family-name"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  placeholder="Your last name"
                  autoComplete="family-name"
                  maxLength={50}
                  required
                />
              </label>

              <label className="field">
                Gender
                <select
                  name="gender"
                  value={gender}
                  onChange={(event) =>
                    setGender(event.target.value)
                  }
                  required
                >
                  <option value="">Select your gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">
                    Prefer not to say
                  </option>
                </select>
              </label>
            </>
          )}

          <label className="field">
            Email
            <input
              id={
                mode === "signIn"
                  ? "sign-in-email"
                  : "sign-up-email"
              }
              type="email"
              name={mode === "signIn" ? "username" : "email"}
              value={mode === "signIn" ? signInEmail : signUpEmail}
              onChange={(event) => {
                if (mode === "signIn") {
                  setSignInEmail(event.target.value);
                } else {
                  setSignUpEmail(event.target.value);
                }
              }}
              placeholder="you@example.com"
              autoComplete={
                mode === "signIn" ? "username" : "email"
              }
              required
            />
          </label>

          <label className="field">
            Password
            <input
              id={
                mode === "signIn"
                  ? "sign-in-password"
                  : "sign-up-password"
              }
              type="password"
              name={
                mode === "signIn" ? "password" : "new-password"
              }
              value={
                mode === "signIn"
                  ? signInPassword
                  : signUpPassword
              }
              onChange={(event) => {
                if (mode === "signIn") {
                  setSignInPassword(event.target.value);
                } else {
                  setSignUpPassword(event.target.value);
                }
              }}
              placeholder={
                mode === "signUp"
                  ? "At least 6 characters"
                  : "Your password"
              }
              autoComplete={
                mode === "signIn"
                  ? "current-password"
                  : "new-password"
              }
              required
            />
          </label>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting
              ? "Please wait..."
              : mode === "signIn"
                ? "Sign in"
                : "Create account"}
          </button>

          {mode === "signIn" && (
            <button
              type="button"
              className="auth-forgot-link"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          )}
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        {onGoogleSignIn && (
          <div className="auth-google-option">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onGoogleSignIn?.(mode)}
              disabled={googleBusy || submitting}
            >
              {googleBusy
                ? "Please wait..."
                : mode === "signUp"
                  ? "Sign up with Google"
                  : "Sign in with Google"}
            </button>

            {googleError && (
              <p className="error-text" role="alert">
                {googleError}
              </p>
            )}
          </div>
        )}

        <div className="guest-option">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onContinueAsGuest}
          >
            Continue as guest
          </button>

          <p className="muted small">
            Guests can search any city and see the full forecast.
            Favourite locations are only saved to an account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
