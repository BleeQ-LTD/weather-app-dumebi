import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getUserProfile } from "../firebaseService/profileService";

export interface AccountSummary {
  photo: string; // uploaded profile picture, "" when none
  firstName: string;
  lastName: string;
}

const EMPTY: AccountSummary = { photo: "", firstName: "", lastName: "" };

// What the sidebar and bottom bar show for the signed-in user: their first
// name (not their email) and their picture or initials. update() applies a
// profile save straight away.
export function useAccountPhoto(user: User | null) {
  const [state, setState] = useState<{ uid: string | null; summary: AccountSummary }>({
    uid: null,
    summary: EMPTY,
  });
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid) return;
    let active = true;

    getUserProfile(uid)
      .then((profile) => {
        if (!active) return;
        setState({
          uid,
          summary: {
            photo: profile?.photo ?? "",
            firstName: profile?.firstName ?? "",
            lastName: profile?.lastName ?? "",
          },
        });
      })
      .catch((error) => console.warn("Couldn't load the profile summary:", error));

    return () => {
      active = false;
    };
  }, [uid]);

  return {
    ...(uid && state.uid === uid ? state.summary : EMPTY),
    update: (summary: AccountSummary) => setState({ uid, summary }),
  };
}
