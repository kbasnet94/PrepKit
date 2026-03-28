/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-instance deployments. For multi-instance,
 * replace with Redis/Upstash-based limiter.
 */
const hits = new Map<string, number[]>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, timestamps] of hits) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) hits.delete(key);
    else hits.set(key, valid);
  }
}

export function rateLimit(
  key: string,
  { maxRequests = 20, windowMs = 60_000 } = {}
): { ok: boolean; remaining: number } {
  const now = Date.now();
  cleanup(windowMs);

  const cutoff = now - windowMs;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= maxRequests) {
    return { ok: false, remaining: 0 };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { ok: true, remaining: maxRequests - timestamps.length };
}
