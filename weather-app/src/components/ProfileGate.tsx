import type { User } from "firebase/auth";
import CompleteProfileForm from "./CompleteProfileForm";
import Overlay from "./Overlay";
import type { ProfileStatus } from "../hooks/useProfileStatus";

interface ProfileGateOverlayProps {
  user: User;
  status: ProfileStatus;
  onRetry: () => void;
  onSaved: () => void;
}

// The required "one last step" card for Google accounts, and the retry card if
// the profile couldn't be loaded. Neither can be closed.
export default function ProfileGateOverlay({ user, status, onRetry, onSaved }: ProfileGateOverlayProps) {
  if (status === "needs-gender") {
    return (
      <Overlay label="Finish setting up your account">
        <CompleteProfileForm uid={user.uid} onSaved={onSaved} />
      </Overlay>
    );
  }

  if (status === "error") {
    return (
      <Overlay label="Couldn't load your profile">
        <div className="auth-panel">
          <div className="auth-brand">
            <h1>Couldn't load your profile</h1>
            <p className="muted">Check your connection and try again.</p>
          </div>

          <div className="auth-form">
            <button className="btn btn-primary" type="button" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  return null;
}
