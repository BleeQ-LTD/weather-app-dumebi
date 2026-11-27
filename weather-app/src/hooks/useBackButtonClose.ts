import { useEffect, useRef } from "react";

// Lets the browser / phone Back button close an overlay instead of leaving
// the page.
//
// All open overlays share ONE extra history entry (a "guard"; the URL doesn't
// change). Back removes the guard and closes the top overlay; if others are
// still open, the guard is put back. When the last overlay closes some other
// way, the guard is removed again so history doesn't fill up.
//
// Clean-up is deferred one tick, so an overlay that closes while another opens
// (sign-in → complete profile), or React's development double-run of effects,
// doesn't bounce history around.

interface Entry {
  close: () => void;
}

const stack: Entry[] = [];
let guardActive = false;
let ignorePops = 0;
let listening = false;

function handlePopState() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  if (!guardActive) return;

  guardActive = false;
  stack[stack.length - 1]?.close();
  settle();
}

function ensureGuard() {
  if (guardActive) return;
  window.history.pushState({ ...(window.history.state ?? {}), overlayGuard: true }, "");
  guardActive = true;
}

function settle() {
  setTimeout(() => {
    if (stack.length > 0) {
      ensureGuard();
    } else if (guardActive) {
      guardActive = false;
      if (window.history.state?.overlayGuard) {
        ignorePops++;
        window.history.back();
      }
    }
  }, 0);
}

export function useBackButtonClose(active: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;

    if (!listening) {
      window.addEventListener("popstate", handlePopState);
      listening = true;
    }

    const entry: Entry = { close: () => onCloseRef.current() };
    stack.push(entry);
    settle();

    return () => {
      const index = stack.indexOf(entry);
      if (index !== -1) stack.splice(index, 1);
      settle();
    };
  }, [active]);
}
