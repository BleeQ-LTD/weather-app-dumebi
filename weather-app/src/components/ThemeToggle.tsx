import type { ReactNode } from "react";
import type { ThemeChoice } from "../utils/themePreference";
import { MonitorIcon, MoonIcon, SunIcon } from "./Icons";

interface ThemeToggleProps {
  value: ThemeChoice;
  onChange: (theme: ThemeChoice) => void;
}

const OPTIONS: { value: ThemeChoice; label: string; name: string; icon: ReactNode }[] = [
  { value: "light", label: "Light", name: "Light theme", icon: <SunIcon /> },
  { value: "dark", label: "Dark", name: "Dark theme", icon: <MoonIcon /> },
  { value: "system", label: "System", name: "Follow this device's setting", icon: <MonitorIcon /> },
];

// Light | Dark | System, styled like the °C | °F switch. Icons make the
// choice quicker to spot; the words keep "System" unambiguous.
function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <div className="unit-toggle" role="group" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="unit-option theme-option"
          title={option.name}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
