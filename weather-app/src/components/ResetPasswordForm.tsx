
import { useEffect, useState, type FormEvent } from "react";
import { accountService } from "../firebaseService/accountService";

type Props = {
  onBackToSignIn: () => void;
};

export default function ResetPasswordForm({
  onBackToSignIn,
}: Props) {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validCode, setValidCode] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const actionCode = params.get("oobCode");
    const mode = params.get("mode");

    if (!actionCode || mode !== "resetPassword") {
      setError("This password reset link is invalid or incomplete.");
      setLoading(false);
      return;
    }

    setCode(actionCode);

    let active = true;

    accountService.checkResetCode(actionCode).then((result) => {
      if (!active) return;

      if (result.ok === true) {
        setEmail(result.email);
        setValidCode(true);
      } else {
        setError(result.message);
      }

      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError("Unable to verify this link. Please request a new one.");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const result = await accountService.finishPasswordReset(
        code,
        password,
        confirmPassword
      );

      if (result.ok) {
        setSuccess(true);
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(result.message);
      }
    } catch {
      setError("Unable to reset your password. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <h1>
              {success ? "Password updated" : "Create a new password"}
            </h1>
            <p className="muted">
              {success
                ? "Your account is secure with your new password."
                : "Choose a strong password to get back to your weather dashboard."}
            </p>
          </div>

          {loading ? (
            <p className="muted" role="status">
              Verifying your reset link…
            </p>
          ) : success ? (
            <div className="auth-form">
              <p className="success-text" role="status">
                Your password has been updated successfully.
              </p>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onBackToSignIn}
              >
                Return to sign in
              </button>
            </div>
          ) : validCode ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="reset-email">Account email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  readOnly
                  autoComplete="username"
                />
              </div>

              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="confirm-password">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}

              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? "Updating password…" : "Update password"}
              </button>
            </form>
          ) : (
            <div className="auth-form">
              <p className="error-text" role="alert">{error}</p>
              <p className="muted">
                The link may have expired or already been used.
              </p>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onBackToSignIn}
              >
                Back to sign in
              </button>
            </div>
          )}

          {!success && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onBackToSignIn}
            >
              Back to sign in
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
