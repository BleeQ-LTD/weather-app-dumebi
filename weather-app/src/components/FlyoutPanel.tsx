import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

interface FlyoutPanelProps {
  anchor: HTMLElement; // the button that opened it
  label: string;
  placement: "side" | "above"; // to the right of the anchor, or above it
  onClose: () => void;
  children: ReactNode;
}

const GAP = 8;

// A small panel that floats next to the sidebar button that opened it.
// It is positioned from the button's screen position, so the sidebar's own
// scrolling and clipping can't cut it off.
function FlyoutPanel({ anchor, label, placement, onClose, children }: FlyoutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const rect = anchor.getBoundingClientRect();

    if (placement === "side") {
      const top = Math.max(
        GAP,
        Math.min(rect.top, window.innerHeight - panel.offsetHeight - GAP)
      );
      setStyle({ left: rect.right + GAP, top, maxHeight: window.innerHeight - top - GAP });
    } else {
      setStyle({
        left: rect.left,
        bottom: window.innerHeight - rect.top + GAP,
        width: Math.max(rect.width, 240),
        maxHeight: rect.top - 2 * GAP,
      });
    }
  }, [anchor, placement]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      // The anchor handles its own clicks, so closing here too would reopen it
      if (panelRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onClose();
      anchor.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", onClose);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  return (
    <div ref={panelRef} className="flyout" role="dialog" aria-label={label} style={style}>
      {children}
    </div>
  );
}

export default FlyoutPanel;
