import { useEffect, useState, type FormEvent } from "react";
import { accountService } from "../firebaseService/accountService";

type Phase =
  | { name: "checking" }
  | { name: "ready"; email: string }
  | { name: "invalid"; message: string }
  | { name: "finished"; message: string };

interface ResetPasswordPageProps {
  code: string; // the oobCode query value from the emailed link
  onDone: () => void;
}

// Optional. Firebase's own hosted reset page works with no code. Use this only if you
// set the reset email's action URL to your site in Authentication, Templates.
function ResetPasswordPage({ code, onDone }: ResetPasswordPageProps) {
  const [phase, setPhase] = useState<Phase>({ name: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");


  useEffect(() => {
    let cancelled = false;

    accountService
      .checkResetCode(code)
      .then((result) => {
        if (cancelled) return;

        if (result.ok) {
          setPhase({ name: "ready", email: result.email });
        } else {
          setPhase({
            name: "invalid",
            message:
              "This password reset link is invalid or has expired.",
          });
        }
      })
      .catch(() => {
        if (cancelled) return;

        setPhase({
          name: "invalid",
          message: "Unable to verify your reset link. Please try again.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [code]);


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");
    const result = await accountService.finishPasswordReset(code, password, confirm);
    setBusy(false);

    if (result.ok) {
      setPhase({
        name: "finished",
        message: "Your password has been reset successfully.",
      });
    } else {
      setError(result.message);
    }
  }

  if (phase.name === "checking") return <p role="status">Checking your link...</p>;

  if (phase.name === "invalid" || phase.name === "finished") {
    return (
      <div className="auth-form">
        <p className={phase.name === "invalid" ? "error-text" : undefined} role="status">
          {phase.message}
        </p>
        <button type="button" className="btn" onClick={onDone}>
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2>Choose a new password</h2>
      <p className="muted small">For {phase.email}</p>

      <label htmlFor="new-password">New password</label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <label htmlFor="confirm-password">Confirm password</label>
      <input
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />

      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Saving..." : "Save new password"}
      </button>
    </form>
  );
}

export default ResetPasswordPage;
