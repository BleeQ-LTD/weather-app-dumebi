import { useState, type FormEvent } from "react";
import { accountService } from "../firebaseService/accountService";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    const result = await accountService.requestPasswordReset(email);

    setBusy(false);
    if (result.ok) setMessage(result.message);
    else setError(result.message);
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2>Reset your password</h2>
      <p className="muted small">
        Enter the email you signed up with and we will send a link to choose a new password.
      </p>

      <label htmlFor="forgot-email">Email</label>
      <input
        id="forgot-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}

      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Sending..." : "Send reset link"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        Back to sign in
      </button>
    </form>
  );
}

export default ForgotPasswordForm;
