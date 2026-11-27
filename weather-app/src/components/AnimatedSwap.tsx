import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface AnimatedSwapProps {
  // Change this to switch views (e.g. "signIn" → "forgot")
  viewKey: string;
  children: ReactNode;
}

// Swaps views inside one card: the new view fades in and the card's height
// glides to fit it, so "Forgot password?" feels like the same card turning over.
function AnimatedSwap({ viewKey, children }: AnimatedSwapProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const measure = () => setHeight(inner.offsetHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="swap" style={{ height }}>
      <div ref={innerRef}>
        <div key={viewKey} className="swap-view">
          {children}
        </div>
      </div>
    </div>
  );
}

export default AnimatedSwap;
