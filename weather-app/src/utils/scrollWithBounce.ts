// Easing that overshoots the target a little and then settles back (a "bounce")
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Scrolls an element sideways to `target` (in px) with a bounce.
// Returns a function that cancels the animation.
export function scrollWithBounce(element: HTMLElement, target: number, duration = 900): () => void {
  // Respect "reduce motion": jump straight there
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.scrollLeft = target;
    return () => {};
  }

  const start = element.scrollLeft;
  const distance = target - start;
  const startTime = performance.now();
  let frame = 0;

  function step(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);
    element.scrollLeft = start + distance * easeOutBack(progress);
    if (progress < 1) frame = requestAnimationFrame(step);
  }

  frame = requestAnimationFrame(step);

  return () => cancelAnimationFrame(frame);
}
