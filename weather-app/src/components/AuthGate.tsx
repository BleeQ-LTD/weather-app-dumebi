import { useState, type ComponentProps } from "react";
import AuthScreen from "./AuthScreen";
import EmailLinkForm from "./EmailLinkForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import {
  AuthError,
  getAuthErrorMessage,
  signInWithGoogle,
} from "../firebaseService/authService";
import type { GoogleAuthMode } from "../firebaseService/authService";

type AuthView = "main" | "forgot" | "emailLink";

function AuthGate(props: ComponentProps<typeof AuthScreen>) {
  const [view, setView] = useState<AuthView>("main");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState("");

  async function handleGoogleSignIn(mode: GoogleAuthMode) {
    if (googleBusy) return;

    setGoogleBusy(true);
    setGoogleError("");

    try {
      await signInWithGoogle(mode);
    } catch (error) {
      // Closing the popup is not an error worth showing.
      const closed =
        error instanceof AuthError &&
        (error.code === "auth/popup-closed-by-user" ||
          error.code === "auth/cancelled-popup-request");

      if (!closed) setGoogleError(getAuthErrorMessage(error));
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
