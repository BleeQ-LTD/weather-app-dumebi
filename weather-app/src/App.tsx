
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuth } from "./firebaseService/authService";
import AuthGate from "./components/AuthGate";
import WeatherScreen from "./components/WeatherScreen";
import ProfilePage from "./components/ProfilePage";
import "./App.css";
import { accountService } from "./firebaseService/accountService";
import EmailLinkLanding from "./components/EmailLinkLanding";
import ResetPasswordForm from "./components/ResetPasswordForm";
import ProfileGate from "./components/ProfileGate";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guest, setGuest] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [emailLinkMode, setEmailLinkMode] = useState(() =>
    accountService.isEmailLink(window.location.href)
  );

  const [resetMode, setResetMode] = useState(
    () =>
      accountService.isPasswordResetLink(window.location.href) ||
      window.location.pathname.replace(/\/+$/, "") === "/reset-password"
  );

  useEffect(() => {
    return subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (!currentUser) {
        setProfileOpen(false);
        setGuest(false);
      }
    });
  }, []);

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
    return (
      <ProfileGate key={user.uid} user={user}>
        {profileOpen ? (
          <ProfilePage
            user={user}
            onBack={() => setProfileOpen(false)}
          />
        ) : (
          <WeatherScreen
            key={user.uid}
            user={user}
            onRequestSignIn={() => setGuest(false)}
            onOpenProfile={() => setProfileOpen(true)}
          />
        )}
      </ProfileGate>
    );
  }

  if (guest) {
    return (
      <WeatherScreen
        key="guest"
        user={null}
        onRequestSignIn={() => setGuest(false)}
      />
    );
  }

  return <AuthGate onContinueAsGuest={() => setGuest(true)} />;
}

export default App;
