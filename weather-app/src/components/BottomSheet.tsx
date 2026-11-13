import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CloseIcon } from "./Icons";

interface BottomSheetProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

// A panel that slides up from the bottom on phones. Escape or a tap outside closes it,
// and focus returns to whatever opened it.
function BottomSheet({ label, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();

    return () => {
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        <div className="sheet-header">
          <h2 className="flyout-title">{label}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={`Close ${label}`}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

export default BottomSheet;
