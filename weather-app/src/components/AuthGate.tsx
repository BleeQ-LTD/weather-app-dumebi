
import { useState, type ComponentProps } from "react";
import AuthScreen from "./AuthScreen";
import EmailLinkForm from "./EmailLinkForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import { accountService } from "../firebaseService/accountService";
import ResetPasswordForm from "./ResetPasswordForm";

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

      if (result.ok === false) {
        setGoogleError(result.message);
      }
    } catch {
      setGoogleError("Google sign-in failed. Please try again.");
    } finally {
      setGoogleBusy(false);
    }
  }

  if (window.location.pathname === "/reset-password") {
  return (
    <ResetPasswordForm
      onBackToSignIn={() => {
        window.history.replaceState({}, "", "/");
        setView("main");
      }}
    />
  );
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
        <AuthScreen
          {...props}
          onForgotPassword={() => setView("forgot")}
          onGoogleSignIn={handleGoogleSignIn}
          googleBusy={googleBusy}
          googleError={googleError}
        />
      </div>
    </div>
  );
}

export default AuthGate;
