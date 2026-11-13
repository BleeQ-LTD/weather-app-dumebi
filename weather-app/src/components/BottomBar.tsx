import { useCallback, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import AccountPanel from "./AccountPanel";
import BottomSheet from "./BottomSheet";
import FavouritesPanel from "./FavouritesPanel";
import { GearIcon, PinIcon, UserIcon } from "./Icons";
import type { Location } from "../locationService/locationTypes";
import type { AppNavProps } from "./navTypes";
import StarIcon from "./StarIcon";
import UnitToggle from "./UnitToggle";
import "../styles/sidebar.css";

type SheetName = "favourites" | "units" | "account";

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

// The phone navigation: four labelled items along the bottom of the screen.
// Favourites, Units and Account open as sheets that slide up.
function BottomBar({
  user,
  myLocation,
  isMyLocationActive,
  favourites,
  favouritesError,
  activeFavouriteId,
  temperatureUnit,
  unitError,
  onChangeUnit,
  onSelect,
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
          icon={<StarIcon filled={false} size={20} />}
          label="Favourites"
          aria-haspopup="dialog"
          onClick={() => setSheet("favourites")}
        />
        <BarItem
          icon={<GearIcon />}
          label="Units"
          aria-haspopup="dialog"
          onClick={() => setSheet("units")}
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

      {sheet === "units" && (
        <BottomSheet label="Units" onClose={closeSheet}>
          <UnitToggle value={temperatureUnit} onChange={onChangeUnit} />
          {unitError && (
            <p className="error-text" role="alert">
              {unitError}
            </p>
          )}
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
