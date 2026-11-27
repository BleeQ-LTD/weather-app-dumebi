import { useCallback, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import AccountPanel from "./AccountPanel";
import BottomSheet from "./BottomSheet";
import FavouritesPanel from "./FavouritesPanel";
import { CompareIcon, GearIcon, PinIcon, UserIcon } from "./Icons";
import type { Location } from "../locationService/locationTypes";
import type { AppNavProps } from "./navTypes";
import StarIcon from "./StarIcon";
import SettingsPanel from "./SettingsPanel";
import "../styles/sidebar.css";

type SheetName = "favourites" | "settings" | "account";

interface BarItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  icon: ReactNode;
  label: string;
  active?: boolean;
}

function BarItem({ icon, label, active = false, type = "button", ...rest }: BarItemProps) {
  return (
    <button
      type={type}
      className={active ? "bar-item active" : "bar-item"}
      aria-current={active ? "true" : undefined}
      {...rest}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// The phone navigation: five labelled items along the bottom of the screen.
// Favourites, Settings and Account open as sheets that slide up.
function BottomBar({
  user,
  myLocation,
  isMyLocationActive,
  favourites,
  favouritesError,
  activeFavouriteId,
  temperatureUnit,
  unitError,
  theme,
  onChangeTheme,
  distanceUnit,
  onChangeDistanceUnit,
  appVersion,
  onOpenWhatsNew,
  onChangeUnit,
  onSelect,
  compareOpen,
  onOpenCompare,
  onRemoveFavourite,
  onRequestSignIn,
  onOpenProfile,
  onSignOut,
}: AppNavProps) {
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);

  function handleSelect(location: Location) {
    onSelect(location);
    closeSheet();
  }

  return (
    <>
      <nav className="bottom-bar" aria-label="Main">
        <BarItem
          icon={<PinIcon />}
          label="My Location"
          active={isMyLocationActive}
          disabled={!myLocation}
          onClick={() => myLocation && onSelect(myLocation)}
        />
        <BarItem
          icon={<CompareIcon />}
          label="Compare"
          active={compareOpen}
          onClick={onOpenCompare}
        />
        <BarItem
          icon={<StarIcon filled={false} size={20} />}
          label="Favourites"
          aria-haspopup="dialog"
          onClick={() => setSheet("favourites")}
        />
        <BarItem
          icon={<GearIcon />}
          label="Settings"
          aria-haspopup="dialog"
          onClick={() => setSheet("settings")}
        />
        {user === null ? (
          <BarItem icon={<UserIcon />} label="Sign in" onClick={onRequestSignIn} />
        ) : (
          <BarItem
            icon={<UserIcon />}
            label="Account"
            aria-haspopup="dialog"
            onClick={() => setSheet("account")}
          />
        )}
      </nav>

      {sheet === "favourites" && (
        <BottomSheet label="Favourites" onClose={closeSheet}>
          <FavouritesPanel
            isGuest={user === null}
            favourites={favourites}
            error={favouritesError}
            activeId={activeFavouriteId}
            temperatureUnit={temperatureUnit}
            onSelect={handleSelect}
            onRemove={onRemoveFavourite}
            onRequestSignIn={onRequestSignIn}
          />
        </BottomSheet>
      )}

      {sheet === "settings" && (
        <BottomSheet label="Settings" onClose={closeSheet}>
          <SettingsPanel
            temperatureUnit={temperatureUnit}
            unitError={unitError}
            onChangeUnit={onChangeUnit}
            theme={theme}
            onChangeTheme={onChangeTheme}
            distanceUnit={distanceUnit}
            onChangeDistanceUnit={onChangeDistanceUnit}
            appVersion={appVersion}
            onOpenWhatsNew={onOpenWhatsNew}
          />
        </BottomSheet>
      )}

      {sheet === "account" && user !== null && (
        <BottomSheet label="Account" onClose={closeSheet}>
          <AccountPanel
            user={user}
            onOpenProfile={onOpenProfile}
            onSignOut={onSignOut}
            onDone={closeSheet}
          />
        </BottomSheet>
      )}
    </>
  );
}

export default BottomBar;
