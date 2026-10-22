import { useEffect, useState, type FormEvent } from "react";
import { accountService } from "../firebaseService/accountService";
import type { EmailLinkResult } from "../firebaseService/accountActions";

type Step = "working" | "needs-email" | "done" | "error";
interface View {
  step: Step;
  message: string;
}

let firstAttempt: Promise<EmailLinkResult> | null = null;

// Opening a sign-in link uses it up, so finish it once per page load.
// (React runs effects twice in development, which would otherwise burn the link.)
function finishOnce(): Promise<EmailLinkResult> {
  firstAttempt ??= accountService.completeSignInWithLink(window.location.href);
  return firstAttempt;
}

function viewFor(result: EmailLinkResult): View {
  switch (result.status) {
    case "signed-in":
      return { step: "done", message: "" };
    case "needs-email":
      return { step: "needs-email", message: "" };
    case "error":
      return { step: "error", message: result.message };
    default:
      return { step: "error", message: "This is not a valid sign-in link." };
  }
}

function leave(onDone: () => void) {
  window.history.replaceState(null, "", window.location.pathname);
  onDone();
}

interface EmailLinkLandingProps {
  onDone: () => void;
}

// Show this instead of the normal screen when accountService.isEmailLink(window.location.href) is true
function EmailLinkLanding({ onDone }: EmailLinkLandingProps) {
  const [view, setView] = useState<View>({ step: "working", message: "" });
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    finishOnce().then((result) => {
      if (!cancelled) setView(viewFor(result));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (view.step === "done") leave(onDone);
  }, [view.step, onDone]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setView({ step: "working", message: "" });
    setView(viewFor(await accountService.completeSignInWithLink(window.location.href, email)));
  }

  if (view.step === "working") return <p role="status">Signing you in...</p>;
  if (view.step === "done") return <p role="status">Signed in. Taking you to the app...</p>;

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h2>{view.step === "needs-email" ? "Confirm your email" : "Sign-in link problem"}</h2>
      {view.step === "needs-email" && (
        <p className="muted small">Enter the email address this link was sent to.</p>
      )}
      {view.message && (
        <p className="error-text" role="alert">
          {view.message}
        </p>
      )}

      <label htmlFor="link-email-confirm">Email</label>
      <input
        id="link-email-confirm"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <button type="submit" className="btn">
        Continue
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => leave(onDone)}>
        Back to sign in
      </button>
    </form>
  );
}

export default EmailLinkLanding;
