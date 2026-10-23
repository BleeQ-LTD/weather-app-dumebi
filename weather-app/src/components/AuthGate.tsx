
import { useState, type ComponentProps } from "react";
import AuthScreen from "./AuthScreen";
import EmailLinkForm from "./EmailLinkForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { accountService } from "../firebaseService/accountService";

type AuthView = "main" | "forgot" | "emailLink";

function AuthGate(props: ComponentProps<typeof AuthScreen>) {
  const [view, setView] = useState<AuthView>("main");

  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState("");

  async function handleGoogleSignIn() {
    if (googleBusy) return;

    setGoogleBusy(true);
    setGoogleError("");

    try {
      const result = await accountService.signInWithGoogle();

      if (!result.ok) {
        setGoogleError(result.message);
      }
    } finally {
      setGoogleBusy(false);
    }
  }

  if (view === "forgot") {
    return (
      <div className="auth-page">
        <ForgotPasswordForm onBack={() => setView("main")} />
      </div>
    );
  }

  if (view === "emailLink") {
    return (
      <div className="auth-page">
        <EmailLinkForm onBack={() => setView("main")} />
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <div className="auth-widget">
        <AuthScreen {...props} />
      </div>

      <div className="auth-extra-links">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setView("forgot")}
        >
          Forgot password?
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleGoogleSignIn}
          disabled={googleBusy}
        >
          {googleBusy ? "Signing in..." : "Sign in with Google"}
        </button>

        {googleError && (
          <p className="error-text" role="alert">
            {googleError}
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthGate;
