// Allows at most `max` calls per key within `windowMs`.
// In memory only: it resets on restart and is per server instance.
export function createRateLimiter(
  max: number,
  windowMs: number,
  now: () => number = Date.now
) {
  const hits = new Map<string, number[]>();

  function sweep(current: number): void {
    for (const [key, times] of hits) {
      if (times.every((time) => current - time >= windowMs)) {
        hits.delete(key);
      }
    }
  }

  function allow(key: string): boolean {
    const current = now();

    // Keep memory bounded when many different keys show up.
    if (hits.size > 5000) sweep(current);

    const recent = (hits.get(key) ?? []).filter(
      (time) => current - time < windowMs
    );

    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }

    recent.push(current);
    hits.set(key, recent);
    return true;
  }

  // Gives back the newest slot for a key, for example after a failed send,
  // so a failure does not count against the person's retry.
  function release(key: string): void {
    const times = hits.get(key);

    if (!times || times.length === 0) return;

    times.pop();

    if (times.length === 0) hits.delete(key);
  }

  return Object.assign(allow, { release });
}
