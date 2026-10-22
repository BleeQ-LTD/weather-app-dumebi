import { useEffect, useState } from "react";
import { watchUpdateNotice } from "../firebaseService/remoteConfig";
import { SEEN_KEY, isUnseen, type UpdateNotice } from "../state/updateNotice";

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function markSeen(id: string): void {
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {
    
  }
}

export function useUpdateNotice() {
  const [notice, setNotice] = useState<UpdateNotice | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;

    watchUpdateNotice((next) => {
      if (!cancelled) setNotice(next);
    })
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else stop = unsubscribe;
      })
      .catch((err) => console.error("Watching Remote Config failed:", err));

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  const visible = isUnseen(notice, readSeen()) ? notice : null;

  function dismiss() {
    if (notice) markSeen(notice.id);
    setNotice(null);
  }

  function reload() {
    if (notice) markSeen(notice.id);
    window.location.reload();
  }

  return { notice: visible, dismiss, reload };
}