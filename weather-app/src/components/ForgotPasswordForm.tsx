
import { useState, type FormEvent } from "react";
import { accountService } from "../firebaseService/accountService";

type Props = {
  onBack: () => void;
  backLabel?: string;
};

export default function ForgotPasswordForm({
  onBack,
  backLabel = "Back to sign in",
}: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await accountService.requestPasswordReset(email);

      if (result.ok) {
        setMessage(result.message);
      } else {
        setError(result.message);
      }
    } catch {
      setError("Unable to send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-panel">
          <div className="auth-brand">
            <h1>Forgot your password?</h1>
            <p className="muted">
              It happens. Enter your email and we'll send you a secure
              link to reset your password.
            </p>
          </div>

          {message ? (
            <div className="auth-form">
              <p className="success-text" role="status">
                {message}
              </p>
              <p className="muted">
                Check your inbox and spam folder for the reset email.
              </p>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onBack}
              >
                {backLabel}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setMessage("")}
              >
                Try another email
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="forgot-email">Email address</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <p className="error-text" role="alert">{error}</p>
              )}

              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending reset link…" : "Send reset link"}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={onBack}
              >
                {backLabel}
              </button>
            </form>
          )}
    </div>
  );
}
