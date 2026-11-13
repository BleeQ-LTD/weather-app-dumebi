import type { User } from "firebase/auth";
import { getInitials } from "../utils/accountDisplay";
import { UserIcon } from "./Icons";

interface AvatarProps {
  user: User | null;
}

// Profile photo when there is one, otherwise initials; a plain person icon for Guests
function Avatar({ user }: AvatarProps) {
  if (!user) return <UserIcon />;

  if (user.photoURL) {
    return (
      <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
    );
  }

  return (
    <span className="avatar" aria-hidden="true">
      {getInitials(user)}
    </span>
  );
}

export default Avatar;
