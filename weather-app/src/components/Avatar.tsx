import type { User } from "firebase/auth";
import { getInitials } from "../utils/accountDisplay";
import { UserIcon } from "./Icons";

interface AvatarProps {
  user: User | null;
  photo?: string; // uploaded profile picture; wins over the Google photo
  name?: string; // first + last name from the profile, for the initials
  size?: number; // px; 28 in the sidebar
}

// Uploaded picture, else the Google photo, else initials from the user's
// name (first letter of the email only when no name is known). Guests get a
// plain person icon.
function Avatar({ user, photo, name, size }: AvatarProps) {
  if (!user) return <UserIcon />;

  const style = size
    ? { width: size, height: size, fontSize: Math.round(size * 0.38) }
    : undefined;
  const src = photo || user.photoURL;

  if (src) {
    return (
      <img className="avatar" src={src} alt="" referrerPolicy="no-referrer" style={style} />
    );
  }

  return (
    <span className="avatar" aria-hidden="true" style={style}>
      {getInitials({ displayName: name || user.displayName, email: user.email })}
    </span>
  );
}

export default Avatar;
