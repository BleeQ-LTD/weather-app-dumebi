import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuth } from "./firebaseService/authService";
import AuthGate from "./components/AuthGate";
import WeatherScreen from "./components/WeatherScreen";
import "./App.css";
import { accountService } from "./firebaseService/accountService";
import EmailLinkLanding from "./components/EmailLinkLanding";

// Signed in -> weather. Signed out -> sign-in screen, unless the visitor chose guest mode.
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guest, setGuest] = useState(false);
  const [emailLinkMode, setEmailLinkMode] = useState(() =>
  accountService.isEmailLink(window.location.href)
);

  // Listens for sign in / sign out (returns the unsubscribe function)
  useEffect(() => {
    if (emailLinkMode) {
      return () => {
        <div className="auth-page">
          <EmailLinkLanding onDone={() => setEmailLinkMode(false)} />
        </div>
      };
    }
    return subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

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
