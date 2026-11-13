import { useCallback, useState } from "react";
import { getDisplayName } from "../utils/accountDisplay";
import AccountPanel from "./AccountPanel";
import Avatar from "./Avatar";
import FavouritesPanel from "./FavouritesPanel";
import FlyoutPanel from "./FlyoutPanel";
import { ChevronIcon, GearIcon, PinIcon } from "./Icons";
import NavItem from "./NavItem";
import type { Location } from "../locationService/locationTypes";
import type { AppNavProps } from "./navTypes";
import SidebarToggle from "./SidebarToggle";
import StarIcon from "./StarIcon";
import UnitToggle from "./UnitToggle";
import "../styles/sidebar.css";

type PanelName = "favourites" | "units" | "account";

interface OpenPanel {
  name: PanelName;
  anchor: HTMLElement;
}

interface SidebarProps extends AppNavProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// The desktop sidebar. Expanded it has labels and the Favourites list inline.
// Collapsed it is a narrow rail of icons whose panels open as flyouts.
function Sidebar({
  collapsed,
  onToggleCollapsed,
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
}: SidebarProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel | null>(null);
  const [favouritesExpanded, setFavouritesExpanded] = useState(true);
  const isGuest = user === null;

  const closePanel = useCallback(() => setOpenPanel(null), []);

  function togglePanel(name: PanelName, anchor: HTMLElement) {
    setOpenPanel((current) => (current?.name === name ? null : { name, anchor }));
  }

  function handleToggleCollapsed() {
    closePanel();
    onToggleCollapsed();
  }

  function handleSelect(location: Location) {
    onSelect(location);
    closePanel();
  }

  const favouritesPanel = (
    <FavouritesPanel
      isGuest={isGuest}
      favourites={favourites}
      error={favouritesError}
      activeId={activeFavouriteId}
      temperatureUnit={temperatureUnit}
      onSelect={handleSelect}
      onRemove={onRemoveFavourite}
      onRequestSignIn={onRequestSignIn}
    />
  );

  const unitsPanel = (
    <>
      <UnitToggle value={temperatureUnit} onChange={onChangeUnit} />
      {unitError && (
        <p className="error-text" role="alert">
          {unitError}
        </p>
      )}
    </>
  );

  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"} aria-label="Sidebar">
      <div className="sidebar-header">
        <SidebarToggle open={!collapsed} onToggle={handleToggleCollapsed} />
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        {myLocation && (
          <NavItem
            icon={<PinIcon />}
            label="My Location"
            detail={collapsed ? undefined : myLocation.name}
            active={isMyLocationActive}
            collapsed={collapsed}
            onClick={() => onSelect(myLocation)}
          />
        )}

        {collapsed ? (
          <>
            <NavItem
              icon={<StarIcon filled={false} size={20} />}
              label="Favourites"
              collapsed
              aria-haspopup="dialog"
              aria-expanded={openPanel?.name === "favourites"}
              onClick={(event) => togglePanel("favourites", event.currentTarget)}
            />
            {openPanel?.name === "favourites" && (
              <FlyoutPanel
                anchor={openPanel.anchor}
                label="Favourites"
                placement="side"
                onClose={closePanel}
              >
                <h2 className="flyout-title">Favourites</h2>
                {favouritesPanel}
              </FlyoutPanel>
            )}

            <NavItem
              icon={<GearIcon />}
              label="Units"
              collapsed
              aria-haspopup="dialog"
              aria-expanded={openPanel?.name === "units"}
              onClick={(event) => togglePanel("units", event.currentTarget)}
            />
            {openPanel?.name === "units" && (
              <FlyoutPanel
                anchor={openPanel.anchor}
                label="Units"
                placement="side"
                onClose={closePanel}
              >
                <h2 className="flyout-title">Units</h2>
                {unitsPanel}
              </FlyoutPanel>
            )}
          </>
        ) : (
          <>
            <NavItem
              icon={<StarIcon filled={false} size={20} />}
              label="Favourites"
              trailing={
                <span className="nav-chevron">
                  <ChevronIcon />
                </span>
              }
              aria-expanded={favouritesExpanded}
              onClick={() => setFavouritesExpanded((expanded) => !expanded)}
            />
            {favouritesExpanded && <div className="nav-section">{favouritesPanel}</div>}

            <div className="units-row">
              <span className="nav-icon">
                <GearIcon />
              </span>
              <span className="nav-label">Units</span>
              <UnitToggle value={temperatureUnit} onChange={onChangeUnit} />
            </div>
            {unitError && (
              <p className="error-text units-error" role="alert">
                {unitError}
              </p>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {user === null ? (
          <NavItem
            icon={<Avatar user={null} />}
            label="Sign in"
            detail="Save your favourite cities"
            collapsed={collapsed}
            onClick={onRequestSignIn}
          />
        ) : (
          <>
            <NavItem
              icon={<Avatar user={user} />}
              label={getDisplayName(user)}
              collapsed={collapsed}
              trailing={
                <span className="nav-chevron">
                  <ChevronIcon />
                </span>
              }
              aria-haspopup="dialog"
              aria-expanded={openPanel?.name === "account"}
              onClick={(event) => togglePanel("account", event.currentTarget)}
            />
            {openPanel?.name === "account" && (
              <FlyoutPanel
                anchor={openPanel.anchor}
                label="Account"
                placement={collapsed ? "side" : "above"}
                onClose={closePanel}
              >
                <AccountPanel
                  user={user}
                  onOpenProfile={onOpenProfile}
                  onSignOut={onSignOut}
                  onDone={closePanel}
                />
              </FlyoutPanel>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
