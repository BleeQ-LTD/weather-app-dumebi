import { useCallback, useEffect, useReducer, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuth } from "./firebaseService/authService";
import AuthGate from "./components/AuthGate";
import WeatherScreen from "./components/WeatherScreen";
import ProfilePage from "./components/ProfilePage";
import "./App.css";
import { accountService } from "./firebaseService/accountService";
import EmailLinkLanding from "./components/EmailLinkLanding";
import ResetPasswordForm from "./components/ResetPasswordForm";
import Overlay from "./components/Overlay";
import ProfileGateOverlay from "./components/ProfileGate";
import { useProfileStatus } from "./hooks/useProfileStatus";
import { useAppUpdate } from "./hooks/useAppUpdate";
import UpdateBanner from "./components/UpdateBanner";
import WhatsNew from "./components/WhatsNew";

// Every account screen is an overlay on top of the weather, which is always
// shown (as a guest until Firebase says who is signed in).
type OverlayName = "signIn" | "profile" | "reset" | "emailLink" | "whatsNew" | null;

function initialOverlay(): OverlayName {
  if (
    accountService.isPasswordResetLink(window.location.href) ||
    window.location.pathname.replace(/\/+$/, "") === "/reset-password"
  ) {
    return "reset";
  }
  if (accountService.isEmailLink(window.location.href)) return "emailLink";
  return null;
}

// Links from emails carry codes in the address; drop them once handled.
function clearLinkFromAddress() {
  window.history.replaceState(window.history.state, "", "/");
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [overlay, setOverlay] = useState<OverlayName>(initialOverlay);

  const profile = useProfileStatus(user);
  // New-version prompt and release notes (Remote Config "version_history")
  const update = useAppUpdate();
  // A name change updates the signed-in account in place; this redraws the
  // screen so the sidebar shows the new name.
  const [, redraw] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    return subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      // Signed in: the sign-in card has done its job. Signed out: no profile.
      setOverlay((current) => {
        if (currentUser && current === "signIn") return null;
        if (!currentUser && current === "profile") return null;
        return current;
      });
    });
  }, []);

  const close = useCallback(() => setOverlay(null), []);
  const openSignIn = useCallback(() => setOverlay("signIn"), []);

  const signedIn = authReady ? user : null;

  return (
    <>
      <WeatherScreen
        user={signedIn}
        accountReady={signedIn !== null && profile.status === "ready"}
        signInOpen={overlay === "signIn"}
        onRequestSignIn={openSignIn}
        onOpenProfile={() => setOverlay("profile")}
        appVersion={update.currentVersion}
        onOpenWhatsNew={update.history.length > 0 ? () => setOverlay("whatsNew") : undefined}
      />

      <UpdateBanner prompt={update.prompt} onReload={update.reload} onLater={update.later} />

      {overlay === "whatsNew" && (
        <Overlay label="What's new" onClose={close}>
          <WhatsNew history={update.history} currentVersion={update.currentVersion} />
        </Overlay>
      )}

      {overlay === "signIn" && !signedIn && <AuthGate onClose={close} />}

      {overlay === "profile" && signedIn && (
        <ProfilePage user={signedIn} onBack={close} onProfileSaved={redraw} />
      )}

      {overlay === "reset" && (
        <Overlay
          label="Reset password"
          onClose={() => {
            clearLinkFromAddress();
            close();
          }}
        >
          <ResetPasswordForm
            onBackToSignIn={() => {
              clearLinkFromAddress();
              setOverlay(signedIn ? null : "signIn");
            }}
          />
        </Overlay>
      )}

      {overlay === "emailLink" && (
        <Overlay
          label="Email link sign-in"
          onClose={() => {
            clearLinkFromAddress();
            close();
          }}
        >
          <div className="auth-panel">
            <EmailLinkLanding onDone={close} />
          </div>
        </Overlay>
      )}

      {signedIn && (
        <ProfileGateOverlay
          user={signedIn}
          status={profile.status}
          onRetry={profile.retry}
          onSaved={profile.markReady}
        />
      )}
    </>
  );
}

export default App;
