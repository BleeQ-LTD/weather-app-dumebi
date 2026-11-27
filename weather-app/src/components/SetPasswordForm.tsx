import { useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import {
  MIN_PASSWORD_LENGTH,
  SetPasswordError,
  setAccountPassword,
} from "../firebaseService/passwordLink";

interface SetPasswordFormProps {
  user: User;
  onBack: () => void;
  onDone: () => void; // the account now has a password
}

// For Google accounts: add a password so email + password sign-in works too.
export default function SetPasswordForm({ user, onBack, onDone }: SetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await setAccountPassword(user, password, confirmPassword);
      setDone(true);
      setPassword("");
      setConfirmPassword("");
      onDone();
    } catch (err) {
      console.error("Setting a password failed, code:", (err as { code?: string }).code);
      setError(
        err instanceof SetPasswordError ? err.message : "Couldn't set your password. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-panel">
      <div className="auth-brand">
        <h1>{done ? "Password set" : "Set a password"}</h1>
        <p className="muted">
          {done
            ? "You can now sign in with Google or with your email and password."
            : "Your account uses Google sign-in. Add a password to also sign in with your email."}
        </p>
      </div>

      {done ? (
        <div className="auth-form">
          <p className="success-text" role="status">
            Password added to {user.email}.
          </p>
          <button className="btn btn-primary" type="button" onClick={onBack}>
            Back to profile
          </button>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Lets password managers save the new login against the right email */}
          <input type="email" value={user.email ?? ""} autoComplete="username" readOnly hidden />

          <div className="field">
            <label htmlFor="set-password">New password</label>
            <input
              id="set-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="set-password-confirm">Confirm password</label>
            <input
              id="set-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}

          <p className="muted small">
            You may be asked to confirm with Google first.
          </p>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving password…" : "Set password"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onBack} disabled={saving}>
            Back to profile
          </button>
        </form>
      )}
    </div>
  );
}
