import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./Icons";
import { useBackButtonClose } from "../hooks/useBackButtonClose";

interface OverlayProps {
  label: string;
  // Leave out for steps that can't be skipped (e.g. completing a profile)
  onClose?: () => void;
  children: ReactNode;
}

// How many overlays are open; the app stays inert until the last one closes
let openOverlays = 0;

// A card floating over the blurred weather screen: centred on desktop, a tall
// sheet on phones. × / Escape / clicking the blur / Back all close it.
// The app behind is made inert, so it can't be scrolled, clicked or tabbed to.
function Overlay({ label, onClose, children }: OverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const closable = Boolean(onClose);

  useBackButtonClose(closable, () => onClose?.());

  useEffect(() => {
    const root = document.getElementById("root");
    const opener = document.activeElement as HTMLElement | null;

    openOverlays++;
    root?.setAttribute("inert", "");
    cardRef.current?.focus({ preventScroll: true });

    return () => {
      openOverlays--;
      if (openOverlays === 0) root?.removeAttribute("inert");
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!onClose) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="overlay">
      <div className="overlay-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={cardRef}
        className="overlay-card"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {onClose && (
          <button
            type="button"
            className="icon-button overlay-close"
            aria-label={`Close ${label}`}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export default Overlay;
