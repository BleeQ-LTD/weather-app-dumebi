import { useState } from "react";
import AuthScreen from "./AuthScreen";
import Overlay from "./Overlay";
import AnimatedSwap from "./AnimatedSwap";
import EmailLinkForm from "./EmailLinkForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import {
  AuthError,
  getAuthErrorMessage,
  signInWithGoogle,
} from "../firebaseService/authService";
import type { GoogleAuthMode } from "../firebaseService/authService";

type AuthView = "main" | "forgot" | "emailLink";

interface AuthGateProps {
  onClose: () => void; // back to the weather (also "Continue as guest")
}

// The sign-in overlay. Sign in / Forgot password / Email link swap inside the
// same card.
function AuthGate({ onClose }: AuthGateProps) {
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

  const title =
    view === "forgot" ? "Forgot password" : view === "emailLink" ? "Email link sign-in" : "Sign in";

  return (
    <Overlay label={title} onClose={onClose}>
      <AnimatedSwap viewKey={view}>
        {view === "forgot" ? (
          <ForgotPasswordForm onBack={() => setView("main")} />
        ) : view === "emailLink" ? (
          <EmailLinkForm onBack={() => setView("main")} />
        ) : (
          <AuthScreen
            onContinueAsGuest={onClose}
            onForgotPassword={() => setView("forgot")}
            onGoogleSignIn={handleGoogleSignIn}
            googleBusy={googleBusy}
            googleError={googleError}
          />
        )}
      </AnimatedSwap>
    </Overlay>
  );
}

export default AuthGate;
