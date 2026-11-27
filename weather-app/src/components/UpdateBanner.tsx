import { useState } from "react";
import type { VersionPrompt } from "../state/versionHistory";

interface UpdateBannerProps {
  prompt: VersionPrompt;
  onReload: () => void;
  onLater: () => void;
}

// "Version 1.1.0 is available" with Reload / Later and the release notes.
// Shown only once the new build is live (see state/versionHistory.ts).
function UpdateBanner({ prompt, onReload, onLater }: UpdateBannerProps) {
  const [showNotes, setShowNotes] = useState(false);

  if (prompt.kind === "none") return null;

  const release = prompt.kind === "release" ? prompt.release : null;
  const hasNotes = Boolean(release && release.notes.length > 0);

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <div className="update-banner-row">
        <p className="update-banner-text">
          {release ? `Version ${release.version} is available.` : "A new version is available."}
          {hasNotes && (
            <button
              type="button"
              className="update-banner-link"
              aria-expanded={showNotes}
              onClick={() => setShowNotes((open) => !open)}
            >
              {showNotes ? "Hide what's new" : "What's new"}
            </button>
          )}
        </p>
        <div className="update-banner-actions">
          <button type="button" className="btn btn-primary" onClick={onReload}>
            Reload
          </button>
          <button type="button" className="btn btn-secondary" onClick={onLater}>
            Later
          </button>
        </div>
      </div>

      {showNotes && release && (
        <ul className="update-banner-notes">
          {release.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UpdateBanner;
