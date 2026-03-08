interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 100;
const STRICT_LIMIT = 10;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, WINDOW_MS);

export function checkRateLimit(
  ip: string,
  isExpensiveEndpoint: boolean
): { allowed: boolean; retryAfterSecs: number } {
  const limit = isExpensiveEndpoint ? STRICT_LIMIT : DEFAULT_LIMIT;
  const now = Date.now();
  const key = `${isExpensiveEndpoint ? "strict" : "default"}:${ip}`;

  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(key, entry);
    return { allowed: true, retryAfterSecs: 0 };
  }

  entry.count += 1;
  if (entry.count > limit) {
    const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSecs };
  }

  return { allowed: true, retryAfterSecs: 0 };
}
