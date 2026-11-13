import { SKY_THEMES, type SkyTheme } from "../weatherService/weatherUtils";

interface SkyBackgroundProps {
  theme: SkyTheme | null;
}

// A fixed gradient behind the whole weather screen. Every theme is its own
// layer and only the active one is visible, so switching cities cross-fades
// smoothly (CSS can't transition one gradient into another directly).
function SkyBackground({ theme }: SkyBackgroundProps) {
  return (
    <div className="sky" aria-hidden="true">
      {SKY_THEMES.map((name) => (
        <div
          key={name}
          className={`sky-layer sky-${name}${name === theme ? " is-active" : ""}`}
        />
      ))}
    </div>
  );
}

export default SkyBackground;
