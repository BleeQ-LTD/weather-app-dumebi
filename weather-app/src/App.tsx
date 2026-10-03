import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { subscribeToAuth } from "./firebaseService/authService";
import AuthScreen from "./components/AuthScreen";
import WeatherScreen from "./components/WeatherScreen";
import "./App.css";

// Signed out -> sign in / sign up screen. Signed in -> the weather screen.
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

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

  if (!user) {
    return <AuthScreen />;
  }

  return <WeatherScreen user={user} />;
}

export default App;
