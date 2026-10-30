import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuth } from "./firebaseService/authService";
import AuthGate from "./components/AuthGate";
import WeatherScreen from "./components/WeatherScreen";
import "./App.css";
import { accountService } from "./firebaseService/accountService";
import EmailLinkLanding from "./components/EmailLinkLanding";
import ResetPasswordForm from "./components/ResetPasswordForm";

// Signed in -> weather. Signed out -> sign-in screen, unless the visitor chose guest mode.
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guest, setGuest] = useState(false);
  const [emailLinkMode, setEmailLinkMode] = useState(() =>
    accountService.isEmailLink(window.location.href)
  );
  const [resetMode, setResetMode] = useState(
    () => window.location.pathname === "/reset-password"
  );

  // Listens for sign in / sign out (returns the unsubscribe function)
  useEffect(() => {
    return subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

  // Opened from the password-reset email: show this whether or not anyone is signed in.
  if (resetMode) {
    return (
      <ResetPasswordForm
        onBackToSignIn={() => {
          window.history.replaceState({}, "", "/");
          setResetMode(false);
        }}
      />
    );
  }

  if (emailLinkMode) {
    return (
      <div className="auth-page">
        <EmailLinkLanding onDone={() => setEmailLinkMode(false)} />
      </div>
    );
  }

  if (!authReady) {
    return <p className="status">Loading...</p>;
  }

  if (user) {
    return <WeatherScreen key={user.uid} user={user} onRequestSignIn={() => setGuest(false)} />;
  }

  if (guest) {
    return <WeatherScreen key="guest" user={null} onRequestSignIn={() => setGuest(false)} />;
  }

  return <AuthGate onContinueAsGuest={() => setGuest(true)} />;
}

export default App;
