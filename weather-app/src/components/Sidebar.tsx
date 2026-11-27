import { useCallback, useState } from "react";
import { getDisplayName } from "../utils/accountDisplay";
import AccountPanel from "./AccountPanel";
import Avatar from "./Avatar";
import FavouritesPanel from "./FavouritesPanel";
import FlyoutPanel from "./FlyoutPanel";
import { ChevronIcon, CompareIcon, GearIcon, PinIcon } from "./Icons";
import NavItem from "./NavItem";
import type { Location } from "../locationService/locationTypes";
import type { AppNavProps } from "./navTypes";
import SidebarToggle from "./SidebarToggle";
import StarIcon from "./StarIcon";
import SettingsPanel from "./SettingsPanel";
import "../styles/sidebar.css";

type PanelName = "favourites" | "settings" | "account";

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
  theme,
  onChangeTheme,
  distanceUnit,
  onChangeDistanceUnit,
  appVersion,
  onOpenWhatsNew,
  onSelect,
  compareOpen,
  onOpenCompare,
  onRemoveFavourite,
  onRequestSignIn,
  onOpenProfile,
  onSignOut,
}: SidebarProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel | null>(null);
  const isGuest = user === null;
  // Favourites start open for signed-in users and closed for guests (who
  // have none to show). Settings always starts closed.
  const [favouritesExpanded, setFavouritesExpanded] = useState(!isGuest);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // Signing in or out resets Favourites to that default
  const [expandedFor, setExpandedFor] = useState(isGuest);
  if (expandedFor !== isGuest) {
    setExpandedFor(isGuest);
    setFavouritesExpanded(!isGuest);
  }

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

  const settingsPanel = (
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
            detail={myLocation.name}
            active={isMyLocationActive}
            collapsed={collapsed}
            onClick={() => onSelect(myLocation)}
          />
        )}

        <NavItem
          icon={<CompareIcon />}
          label="Compare"
          detail="Two cities side by side"
          active={compareOpen}
          collapsed={collapsed}
          onClick={() => {
            closePanel();
            onOpenCompare();
          }}
        />

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
              label="Settings"
              collapsed
              aria-haspopup="dialog"
              aria-expanded={openPanel?.name === "settings"}
              onClick={(event) => togglePanel("settings", event.currentTarget)}
            />
            {openPanel?.name === "settings" && (
              <FlyoutPanel
                anchor={openPanel.anchor}
                label="Settings"
                placement="side"
                onClose={closePanel}
              >
                <h2 className="flyout-title">Settings</h2>
                {settingsPanel}
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

            <NavItem
              icon={<GearIcon />}
              label="Settings"
              trailing={
                <span className="nav-chevron">
                  <ChevronIcon />
                </span>
              }
              aria-expanded={settingsExpanded}
              onClick={() => setSettingsExpanded((expanded) => !expanded)}
            />
            {settingsExpanded && <div className="nav-section">{settingsPanel}</div>}
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
