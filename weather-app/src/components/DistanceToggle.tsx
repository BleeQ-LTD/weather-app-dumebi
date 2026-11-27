import type { DistanceUnit } from "../weatherService/distanceUtils";

interface DistanceToggleProps {
  value: DistanceUnit;
  onChange: (unit: DistanceUnit) => void;
}

const OPTIONS: { value: DistanceUnit; label: string; name: string }[] = [
  { value: "metric", label: "km · mm", name: "Kilometres, km/h and millimetres" },
  { value: "imperial", label: "mi · in", name: "Miles, mph and inches" },
];

// Wind, visibility and rain amounts; styled like the °C | °F switch
function DistanceToggle({ value, onChange }: DistanceToggleProps) {
  return (
    <div className="unit-toggle" role="group" aria-label="Distance units">
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

export default DistanceToggle;
