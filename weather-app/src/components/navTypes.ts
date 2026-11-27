import type { User } from "firebase/auth";
import type { FavouriteLocation } from "../firebaseService/firebaseTypes";
import type { TemperatureUnit } from "../firebaseService/profileService";
import type { Location } from "../locationService/locationTypes";
import type { ThemeChoice } from "../utils/themePreference";
import type { DistanceUnit } from "../weatherService/distanceUtils";

// Everything the desktop sidebar and the phone bottom bar both need
export interface AppNavProps {
  user: User | null;
  myLocation: Location | null;
  isMyLocationActive: boolean;
  favourites: FavouriteLocation[];
  favouritesError: string;
  activeFavouriteId: string;
  temperatureUnit: TemperatureUnit;
  unitError: string;
  onChangeUnit: (unit: TemperatureUnit) => void;
  theme: ThemeChoice;
  onChangeTheme: (theme: ThemeChoice) => void;
  distanceUnit: DistanceUnit;
  onChangeDistanceUnit: (unit: DistanceUnit) => void;
  appVersion?: string;
  onOpenWhatsNew?: () => void;
  onSelect: (location: Location) => void;
  compareOpen: boolean;
  onOpenCompare: () => void;
  onRemoveFavourite: (id: string) => void;
  onRequestSignIn: () => void;
  onOpenProfile?: () => void;
  onSignOut: () => Promise<void>;
}
