import { useState, type FormEvent } from "react";
import { accountService } from "../firebaseService/accountService";

interface EmailLinkFormProps {
  onBack: () => void;
}

function EmailLinkForm({ onBack }: EmailLinkFormProps) {
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

    const result = await accountService.sendSignInLink(email);

    setBusy(false);
    if (result.ok) setMessage(result.message);
    else setError(result.message);
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2>Sign in with an email link</h2>
      <p className="muted small">No password needed. We email you a one-time link that signs you in.</p>

      <label htmlFor="link-email-request">Email</label>
      <input
        id="link-email-request"
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
        {busy ? "Sending..." : "Email me a link"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        Back to sign in
      </button>
    </form>
  );
}

export default EmailLinkForm;
