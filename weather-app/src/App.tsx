import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuth } from "./firebaseService/authService";
import AuthScreen from "./components/AuthScreen";
import WeatherScreen from "./components/WeatherScreen";
import "./App.css";

// Signed in -> weather. Signed out -> sign-in screen, unless the visitor chose guest mode.
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guest, setGuest] = useState(false);

  // Listens for sign in / sign out (returns the unsubscribe function)
  useEffect(() => {
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

  return <AuthScreen onContinueAsGuest={() => setGuest(true)} />;
}

export default App;
