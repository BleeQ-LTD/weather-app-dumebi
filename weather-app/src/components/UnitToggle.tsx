import type { TemperatureUnit } from "../firebaseService/profileService";

interface UnitToggleProps {
  value: TemperatureUnit;
  onChange: (unit: TemperatureUnit) => void;
}

const OPTIONS: { value: TemperatureUnit; label: string; name: string }[] = [
  { value: "celsius", label: "°C", name: "Celsius" },
  { value: "fahrenheit", label: "°F", name: "Fahrenheit" },
];

// Two-way switch for the temperature unit. It only changes temperatures;
// wind and pressure keep their units.
function UnitToggle({ value, onChange }: UnitToggleProps) {
  return (
    <div className="unit-toggle" role="group" aria-label="Temperature unit">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="unit-option"
          title={option.name}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default UnitToggle;
