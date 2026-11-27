import type { Release } from "../state/versionHistory";

interface WhatsNewProps {
  history: Release[];
  currentVersion: string;
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// The release history from Remote Config, newest first (opened from Settings)
function WhatsNew({ history, currentVersion }: WhatsNewProps) {
  return (
    <div className="auth-panel">
      <div className="auth-brand">
        <h1>What's new</h1>
        <p className="muted">You're on version {currentVersion}.</p>
      </div>

      <ol className="whats-new">
        {history.map((release) => (
          <li key={release.version} className="whats-new-release">
            <p className="whats-new-head">
              <span className="whats-new-version">Version {release.version}</span>
              {release.version === currentVersion && <span className="whats-new-tag">Current</span>}
              {release.date && <span className="muted small">{formatDate(release.date)}</span>}
            </p>
            {release.notes.length > 0 && (
              <ul className="whats-new-notes">
                {release.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default WhatsNew;
