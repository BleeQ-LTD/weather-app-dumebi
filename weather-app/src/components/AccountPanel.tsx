import { useState } from "react";
import type { User } from "firebase/auth";
import { getDisplayName } from "../utils/accountDisplay";
import Button from "./Button";

interface AccountPanelProps {
  user: User;
  onOpenProfile?: () => void;
  onSignOut: () => Promise<void>;
  onDone: () => void; // closes the flyout or sheet after an action
}

// The small menu behind the account row, for signed-in users
function AccountPanel({ user, onOpenProfile, onSignOut, onDone }: AccountPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = getDisplayName(user);

  async function handleSignOut() {
    setBusy(true);
    setError("");

    try {
      await onSignOut();
    } catch (signOutError) {
      console.error("Sign out failed:", signOutError);
      setError("Couldn't sign you out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="account-panel">
      <div>
        <p className="account-name">{name}</p>
        {user.email && user.email !== name && (
          <p className="muted small account-email">{user.email}</p>
        )}
      </div>
      {onOpenProfile && (
        <Button
          variant="secondary"
          onClick={() => {
            onOpenProfile();
            onDone();
          }}
        >
          Profile
        </Button>
      )}
      <Button variant="secondary" disabled={busy} onClick={handleSignOut}>
        {busy ? "Signing out…" : "Sign out"}
      </Button>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default AccountPanel;
