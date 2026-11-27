import type { TemperatureUnit } from "../firebaseService/profileService";
import type { ThemeChoice } from "../utils/themePreference";
import ThemeToggle from "./ThemeToggle";
import DistanceToggle from "./DistanceToggle";
import type { DistanceUnit } from "../weatherService/distanceUtils";
import UnitToggle from "./UnitToggle";

interface SettingsPanelProps {
  temperatureUnit: TemperatureUnit;
  unitError: string;
  onChangeUnit: (unit: TemperatureUnit) => void;
  theme: ThemeChoice;
  onChangeTheme: (theme: ThemeChoice) => void;
  distanceUnit: DistanceUnit;
  onChangeDistanceUnit: (unit: DistanceUnit) => void;
  appVersion?: string;
  onOpenWhatsNew?: () => void; // only when release notes are available
}

// Units and Theme: shown in the sidebar dropdown, its collapsed flyout and the
// phone Settings sheet.
function SettingsPanel({
  temperatureUnit,
  unitError,
  onChangeUnit,
  theme,
  onChangeTheme,
  distanceUnit,
  onChangeDistanceUnit,
  appVersion,
  onOpenWhatsNew,
}: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <div className="settings-row">
        <span className="settings-label">Temperature</span>
        <UnitToggle value={temperatureUnit} onChange={onChangeUnit} />
      </div>
      {unitError && (
        <p className="error-text" role="alert">
          {unitError}
        </p>
      )}

      <div className="settings-row">
        <span className="settings-label">Wind, distance & rain</span>
        <DistanceToggle value={distanceUnit} onChange={onChangeDistanceUnit} />
      </div>

      <div className="settings-row">
        <span className="settings-label">Theme</span>
        <ThemeToggle value={theme} onChange={onChangeTheme} />
      </div>

      {appVersion && (
        <p className="settings-version muted small">
          Version {appVersion}
          {onOpenWhatsNew && (
            <>
              {" · "}
              <button type="button" className="settings-link" onClick={onOpenWhatsNew}>
                What's new
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}

export default SettingsPanel;
